const _ = require("lodash");
const chalk = require("chalk");
const Configuration = require("./Configuration");
const CONSTANTS = require("../util/Constants");
const FrameworkError = require("../util/FrameworkError");
const fs = require("fs");
const InteractionResult = require("../test/TestResult").InteractionResult;
const LoggingErrorHelper = require("../util/LoggingErrorHelper");
const SmapiError = require("../util/SmapiError");
const TestParser = require("../test/TestParser");
const TestResult = require("../test/TestResult").TestResult;
const Util = require("../util/Util");

module.exports = class TestRunner {
    constructor(config) {
        this._config = config;
        this._subscribers = { message: [], result: []};
    }

    get configuration() {
        return this._config;
    }

    async run(testFile, context) {
        return new Promise((resolve, reject) => {
            fs.readFile(testFile, "utf8", async (error, data) => {
                if (error) {
                    reject(error);
                }

                try {
                    // This may have already been called, but needs to be called again inside of the Jest runner
                    await Configuration.configure(this._config);

                    const testSuite = this.parseContents(testFile, data);
                    resolve(await this.runSuite(testSuite, context));
                } catch (e) {
                    LoggingErrorHelper.error("bst-test", "Error using bst-test on Node: " + process.version);
                    LoggingErrorHelper.error("bst-test", e.stack);
                    reject(e);
                }

            });
        });
    }

    async runSuite(testSuite, context) {
        // This may have already been called, but needs to be called again inside of the Jest runner
        await Configuration.configure(this._config);

        await testSuite.loadLocalizedValues();
        const locales = testSuite.locales;
        if (locales) {
            const localesList = locales.split(",").map(l => l.trim());
            let results = [];
            for (let i=0; i < localesList.length; i++) {
                results.push(await this.runSuiteForLocale(testSuite, context, localesList[i]));
            }
            results = [].concat.apply([], results);
            return results;
        } else {
            return await this.runSuiteForLocale(testSuite, context, testSuite.locale);
        }
    }

    async runSuiteForLocale(testSuite, context, locale) {
        if (!locale) {
            throw new FrameworkError("Locale must be defined either in the testing.json or the test file itself under the config element");
        }

        const testSuiteWithLocale = _.cloneDeep(testSuite);
        testSuiteWithLocale.currentLocale = locale;
        this.replaceLocalizedValues(testSuiteWithLocale);

        if (testSuiteWithLocale.filterObject() && testSuiteWithLocale.filterObject().onTestSuiteStart) {
            await testSuiteWithLocale.filterObject().onTestSuiteStart(testSuiteWithLocale);
        }

        const invokerName = this.getInvoker(testSuite);
        const InvokerClass = require("./" + invokerName);
        const invoker = new InvokerClass(this);
        try {
            await invoker.before(testSuiteWithLocale);
        } catch (error) {
            this.emit("result", error);
            throw error;
        }
        const batchEnabled = testSuiteWithLocale.batchEnabled;
        const asyncMode = testSuiteWithLocale.asyncMode;

        testSuiteWithLocale.processIncludedAndExcludedTags();
        testSuiteWithLocale.processOnlyFlag();
        const testResults = [];

        if (testSuite.hasDeprecatedOperators) {
            // eslint-disable-next-line no-console
            console.log(chalk.yellow("WARNING: == and =~ operators are no longer supported, use \":\" instead"));
        }

        if (testSuite.type !== "unit" && testSuite.hasDeprecatedE2EOperators) {
            // eslint-disable-next-line no-console
            console.log(chalk.yellow("WARNING: >, >=, < and <= are unit test operators only"));
        }

        for (const test of testSuiteWithLocale.tests) {

            if (testSuite.filterObject() && testSuite.filterObject().onTestStart) {
                await testSuite.filterObject().onTestStart(test);
            }

            await invoker.beforeTest(test);

            const testResult = new TestResult(test);
            testResult.locale = locale;

            testResults.push(testResult);
            if (test.skip) {
                await invoker.afterTest(test);
                // if we skip we still need to do the after test in case is closing something like in VGA
                continue;
            }

            if (invoker.batchSupported() && batchEnabled && (test.hasGoto || test.hasExit)) {
                // eslint-disable-next-line no-console
                console.log(chalk.yellow("Warning: \"Goto\" and \"Exit\" functionality are only available when running in sequential mode, set \"batchEnabled\" property to false to enable it"));
            }

            // Process through the interactions
            // If there is a goto or this is not a batch invoker, run them one-by-one
            let results;
            if (!(invoker.batchSupported() && batchEnabled)) {
                results = await this.sequentialRun(invoker, testSuiteWithLocale, test.interactions, context);
            } else {
                if (invoker.batchSupported() && asyncMode) {
                    results = await this.sequentialRun(invoker, testSuiteWithLocale, test.interactions, context);
                } else {
                    results = await this.batchRun(invoker, testSuiteWithLocale, test.interactions, context);
                }
            }
            testResult.interactionResults = results;

            await invoker.afterTest(test);

            if (testSuite.filterObject() && testSuite.filterObject().onTestEnd) {
                await testSuite.filterObject().onTestEnd(test, testResult);
            }
        }

        await invoker.after(testSuiteWithLocale);

        if (testSuite.filterObject() && testSuite.filterObject().onTestSuiteEnd) {
            await testSuite.filterObject().onTestSuiteEnd(testResults);
        }

        return testResults;
    }

    async resolveVariablesForAssertionInteraction(testInteraction, resolveMethod) {
        if (!testInteraction.assertions || !testInteraction.assertions.length) {
            return;
        }

        // Using for without iterators to properly support async / await
        for (let i = 0; i < testInteraction.assertions.length; i++) {
            const assertion = testInteraction.assertions[i];
            if (!assertion.variables || !assertion.variables.length) {
                continue;
            }
            for (let j = 0; j < assertion.variables.length; j++) {
                const variable = assertion.variables[j];
                const variableValue = await resolveMethod(variable, testInteraction);
                // Empty values are allowed but undefined means no replacement was found
                if (typeof variableValue == "undefined") {
                    return;
                }
                if (Array.isArray(assertion.value)) {
                    const replacedValues = assertion.value.map((val) => {
                        return val.split("{" + variable + "}").join(variableValue);
                    });
                    assertion._value = replacedValues;
                } else {
                    assertion._value = assertion.value.split("{" + variable + "}").join(variableValue);
                }

            }
        }
    }


    async batchRun(invoker, testSuite, interactions, context) {
        const startTime = new Date();
        const responses = await invoker.invokeBatch(interactions);
        const endTime = new Date();

        const totalDuration = endTime - startTime;
        if (interactions.length) {
            const avgDuration = Math.floor(totalDuration / interactions.length);
            interactions.forEach(interaction => interaction.duration = avgDuration);
        }
        // we have variables to resolve, we need to resolve them after calling invocation
        if (testSuite.filterObject() && testSuite.filterObject().resolve) {
            for (let i = 0; i < interactions.length; i++) {
                const testInteraction = interactions[i];
                await this.resolveVariablesForAssertionInteraction(testInteraction, testSuite.filterObject().resolve);
            }
        }

        // Add short-hand properties to each response
        responses.forEach(response => response.inject());

        // Turn the responses into interaction results
        const interactionResults = responses.map(response => this.processResponse(response, testSuite, context));
        return interactionResults;
    }

    async sequentialRun(invoker, testSuite, interactions, context) {
        let goto;
        const results = [];
        const asyncMode = testSuite.asyncMode;

        for (const interaction of interactions) {
            // If we are in async mode we need to ignore any goto logic
            // If a goto is set, keep skipping until we match it
            if (!asyncMode && goto) {
                if (goto === interaction.utterance || goto == interaction.label) {
                    goto = undefined;
                } else {
                    continue;
                }
            }

            this.emit("message", undefined, interaction.toDTO(), context);
            let response;
            const startTime = new Date();

            try {
                response = await invoker.invoke(interaction, interactions);
                const endTime = new Date();
                interaction.duration = endTime - startTime;
                // we have variables to resolve, we need to resolve them after calling invocation
                if (testSuite.filterObject() && testSuite.filterObject().resolve) {
                    // we need to replace all interactions at once
                    if (asyncMode) {
                        for (let i = 0; i < interactions.length; i++) {
                            const testInteraction = interactions[i];
                            await this.resolveVariablesForAssertionInteraction(testInteraction, testSuite.filterObject().resolve);
                        }
                    } else {
                        await this.resolveVariablesForAssertionInteraction(interaction, testSuite.filterObject().resolve);
                    }
                }
            } catch (e) {
                if (!interaction.duration) {
                    interaction.duration = new Date() - startTime;
                }
                const resultOnException = this.handleException(interaction, e);
                results.push(resultOnException);
                const interactionDto = interaction.toDTO();
                interactionDto.result = resultOnException.toDTO();
                this.emit("result", undefined, interactionDto, context);

                // smapi error will stop further interactions
                if (e instanceof SmapiError) {
                    break;
                } else {
                    continue;
                }
            }

            // Add short-hand properties to the response
            response.inject();

            const interactionResult = this.processResponse(response, testSuite, context);
            // If we are in async mode we need to ignore any goto logic
            if (!asyncMode && interactionResult.goto) {
                // If this result is a goto, set the goto label
                goto = interactionResult.goto;
            }

            results.push(interactionResult);
            if (!asyncMode && interactionResult.exited) {
                // If this is an exit, stop processing
                break;
            }

        }

        return results;
    }

    processResponse(response, testSuite, context) {
        const interaction = response.interaction;

        // We check if a filter object is defined
        // If so, it gives the test writer a chance to make changes to the response
        if (testSuite.filterObject() && testSuite.filterObject().onResponse) {
            testSuite.filterObject().onResponse(interaction.test, response.json);
        }

        let result = new InteractionResult(interaction);
        for (const assertion of interaction.assertions) {
            if (assertion.exit) {
                result = new InteractionResult(interaction, assertion);
                break;
            }

            if (!response.supported(assertion.path)) {
                continue;
            }

            const passed = assertion.evaluate(response);
            if (passed) {
                // If this is a goto, stop processing assertions here
                if (assertion.goto) {
                    result = new InteractionResult(interaction, assertion);
                    break;
                }
            } else if (!assertion.goto) {
                // If it did not pass, and was NOT a goto, then it is a failure
                // We do not consider tests that end in goto statements failures if they do not match
                const error = assertion.toString(response.json, response.errorOnProcess);
                result = new InteractionResult(interaction, assertion, error, response.errorOnProcess);
                break;
            } 
        }
        result.rawResponse = response.json;

        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log(chalk.cyan("Response Envelope:\n" + JSON.stringify(response.json, null, 2)));
        }
        const interactionDto = interaction.toDTO(response);
        interactionDto.result = result.toDTO();

        this.emit("result", undefined, interactionDto, context);
        return result;
    }

    parseContents(fileName, testContents) {
        const parser = new TestParser();
        parser.fileName = fileName;
        parser.load(testContents);
        return parser.parse();
    }

    // Method that can be used to print out the request payload, if available
    // TODO - should this be done with an event emitter instead?
    filterRequest(interaction, request) {
        interaction.applyExpressions(request);

        // We check if a filter object is defined
        // If so, it gives the test writer a chance to make changes to the request
        const testSuite = interaction.test.testSuite;
        if (testSuite.filterObject() && testSuite.filterObject().onRequest) {
            testSuite.filterObject().onRequest(interaction.test, request);
        }

        if (testSuite.trace) {
            const test = interaction.test;
            // eslint-disable-next-line no-console
            console.log("File: " +  testSuite.shortFileName + " Test: " + test.description + " Utterance: " + interaction.utterance);

            // eslint-disable-next-line no-console
            console.log(chalk.hex("#ff6633")("Request Envelope:\n" + JSON.stringify(request, null, 2)));
        }
    }

    handleException(interaction, e) {
        const testSuite = interaction.test.testSuite;
        if (e.message && (e.message.startsWith("Unable to match utterance:")
            || e.message.startsWith("Interaction model has no intentName named"))) {
            const message = Util.errorMessageWithLine(e.message, testSuite.fileName, interaction.lineNumber);
            return new InteractionResult(interaction, undefined, message);
        } else {
            LoggingErrorHelper.error("bst-test", "Error using bst-test on Node: " + process.version);
            LoggingErrorHelper.error("bst-test", e.stack);
            if (e.type && e.type === "FrameworkError") {
                return new InteractionResult(interaction, undefined, e.message);
            } else if (e.message) {
                return new InteractionResult(interaction, undefined, e.message + "\n" + e.stack);
            } else {
                return new InteractionResult(interaction, undefined, e.toString());
            }
        }
    }

    subscribe(event, callback) {
        if (event in this._subscribers) {
            this._subscribers[event].push(callback);
        } else {
            this._subscribers[event] = [callback];
        }
    }

    unsubscribe(event) {
        this._subscribers[event] = [];
    }

    emit(event, error, data, context) {
        if (event in this._subscribers) {
            this._subscribers[event].forEach((subscriber) => {
                subscriber(error, data, context);
            });
        }
    }

    getInvoker(testSuite) {
        const invoker = testSuite.invoker;
        if (invoker) {
            return invoker;
        }
        const type = testSuite.type;
        const platform = testSuite.platform;
        if (type === CONSTANTS.TYPE.e2e) {
            return CONSTANTS.INVOKER.virtualDeviceInvoker;
        } else if (type === CONSTANTS.TYPE.simulation) {
            return CONSTANTS.INVOKER.SMAPIInvoker;
        } else if (type === CONSTANTS.TYPE.unit) {
            if (platform === CONSTANTS.PLATFORM.alexa) {
                return CONSTANTS.INVOKER.virtualAlexaInvoker;
            }
            else if (platform === CONSTANTS.PLATFORM.google) {
                return CONSTANTS.INVOKER.virtualGoogleAssistantInvoker;
            }
        }

        throw new FrameworkError("valid type and platform must be defined either in the testing.json or the test file itself under the config element");
    }
    
    replaceLocalizedValues(testSuite) {
        for (const test of testSuite.tests) {
            const localizedDescription = testSuite.getLocalizedValue(test.description) || test.description;
            test.description = localizedDescription;
            for (const interaction of test.interactions) {
                const localizedValue = interaction.utterance
                    .split(" ")
                    .map((word) => {
                        return testSuite.getLocalizedValue(word) || word;
                    })
                    .join(" ");
                interaction.localizedUtterance = localizedValue;
            }
        }
    }
};

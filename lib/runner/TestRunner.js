const _ = require("lodash");
const chalk = require("chalk");
const Configuration = require("./Configuration");
const CONSTANTS = require("../util/Constants");
const FrameworkError = require("../util/FrameworkError");
const fs = require("fs");
const InteractionResult = require("../test/TestResult").InteractionResult;
const LoggingErrorHelper = require("../util/LoggingErrorHelper");
// eslint-disable-next-line spellcheck/spell-checker
const SmapiError = require("../util/SmapiError");
const StopWatch = require("../util/StopWatch");
const TestParser = require("../test/TestParser");
const TestResult = require("../test/TestResult").TestResult;
const Util = require("../util/Util");
const { traceOutput } = require("./TraceOutput");

module.exports = class TestRunner {
    static removeConfigurationCache() {
        Configuration.reset();
    }

    constructor(config) {
        this._config = config;
        this._subscribers = { message: [], result: [] };
    }

    get configuration() {
        return this._config;
    }

    async run(testFile, context) {
        await Configuration.configure(this._config);
        const testSuite = this.parseContents(testFile, fs.readFileSync(testFile, "utf8"));

        return this
            .runSuite(testSuite, context)
            .catch((err) => {
                LoggingErrorHelper.error("bst-test", "Error using bst-test on Node: " + process.version);
                LoggingErrorHelper.error("bst-test", err.stack);
                throw err;
            });
    }

    async runSuite(testSuite, context) {
        // This may have already been called, but needs to be called again inside of the Jest runner
        await Configuration.configure(this._config);
        await testSuite.loadLocalizedValues();

        const locales = ["sms", "whatsapp"].includes(testSuite.platform)
            ? "en-US"
            : testSuite.locales;

        // locales now include locales and locale, if property not present we throw the framework error
        if (!locales) {
            throw new FrameworkError("Locale must be defined either in the testing.json or the test file itself under the config element");
        }

        const localesList = locales.split(",").map(l => l.trim());
        const results = [];
        for (let i = 0; i < localesList.length; i++) {
            results.push(await this.runSuiteForLocale(testSuite, context, localesList[i]));
        }

        return [].concat.apply([], results);
    }

    async runSuiteForLocale(testSuite, context, locale) {
        if (!locale) {
            throw new FrameworkError("Locale must be defined either in the testing.json or the test file itself under the config element");
        }

        const testSuiteWithLocale = _.cloneDeep(testSuite);
        testSuiteWithLocale.currentLocale = locale;
        this.replaceLocalizedValues(testSuiteWithLocale);

        await Util.executeFilter(testSuiteWithLocale.filterArray(), "onTestSuiteStart", testSuiteWithLocale);

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

        const retryNumberWarning = testSuite.retryNumberWarning;
        if (retryNumberWarning) {
            // eslint-disable-next-line no-console
            console.log(chalk.yellow(retryNumberWarning));
        }

        const stopWatchTestSuite = new StopWatch();

        stopWatchTestSuite.resetAndStart();
        for (const test of testSuiteWithLocale.tests) {

            await Util.executeFilter(testSuite.filterArray(), "onTestStart", test);

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

            const stopWatchTest = new StopWatch();
            stopWatchTest.resetAndStart();
            const results = await this.executeRunWrapper(batchEnabled, asyncMode, invoker, testSuiteWithLocale, test.interactions, context);
            stopWatchTest.stop();

            _.set(testResult, "_test_stopWatch", stopWatchTest.toDto());

            testResult.interactionResults = results;

            if (invoker.currentConversation) {
                testResult.conversationId = invoker.currentConversation;
            }

            await invoker.afterTest(test);

            await Util.executeFilter(testSuite.filterArray(), "onTestEnd", test, testResult);
            this.emit("onTestEnd");

        }
        stopWatchTestSuite.stop();

        const usedConfiguration = _.assign({}, Configuration.instance().skillTestingConfig(), testSuite.configuration);

        testResults.forEach((e) => {
            _.set(e, "_testSuite_context", context);
            _.set(e, "_testSuite_stopWatch", stopWatchTestSuite.toDto());
            _.set(e, "_testSuite_projectId", testSuiteWithLocale.projectId);
            _.set(e, "_testSuite_bespokenProjectId", testSuiteWithLocale.bespokenProjectId);
            _.set(e, "_testSuite_virtualDeviceToken", testSuiteWithLocale.virtualDeviceToken);
            _.set(e, "_testSuite_platform", testSuiteWithLocale.platform);
            _.set(e, "_testSuite_type", testSuiteWithLocale.type);
            _.set(e, "_testSuite_global_config", usedConfiguration);
        });

        await invoker.after(testSuiteWithLocale);
        await Util.executeFilter(testSuite.filterArray(), "onTestSuiteEnd", testResults);

        this.emit("onTestSuiteEnd");
        return testResults;
    }

    async executeRunWrapper(batchEnabled, asyncMode, invoker, testSuite, interactions, context) {
        let executionCount = 0;
        let results;
        do {
            if (executionCount > 0) {
                // eslint-disable-next-line no-console
                console.log(chalk.cyan(`Test failed: Retrying ${executionCount}/${testSuite.retryNumber}`));
            }
            results = await this.executeRun(batchEnabled, asyncMode, invoker, testSuite, interactions, context);
            executionCount++;
        } while (executionCount < testSuite.retryNumber + 1 && results.length > 0 &&
            results.some(result => result.errorOnProcess && result.error.error_code &&
                testSuite.retryOn && testSuite.retryOn.length > 0 &&
                testSuite.retryOn.indexOf(result.error.error_code) > -1));
        return results;
    }

    async executeRun(batchEnabled, asyncMode, invoker, testSuite, interactions, context) {
        // Process through the interactions
        // If there is a goto or this is not a batch invoker, run them one-by-one
        let results;
        if (!(invoker.batchSupported() && batchEnabled)) {
            results = await this.sequentialRun(invoker, testSuite, interactions, context);
        } else {
            if (invoker.batchSupported() && asyncMode) {
                results = await this.sequentialRun(invoker, testSuite, interactions, context);
            } else {
                results = await this.batchRun(invoker, testSuite, interactions, context);
            }
        }
        return results;
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

        // Add short-hand properties to each response
        responses.forEach((response) => {
            response.inject();
            if (invoker.currentConversation) {
                response.conversationId = invoker.currentConversation;
            }
        });

        // Turn the responses into interaction results
        const interactionResults = [];
        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            interactionResults.push(await this.processResponse(response, testSuite, context));
        }
        return interactionResults;
    }

    async sequentialRun(invoker, testSuite, interactions, context) {
        let goto;
        let index = -1;
        const results = [];
        const asyncMode = testSuite.asyncMode;

        for (const interaction of interactions) {
            index++;
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
                if (testSuite.trace && index === 0 && invoker.currentConversation) {
                    // eslint-disable-next-line no-console
                    console.log(chalk.cyan("Conversation id: " + invoker.currentConversation));
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

            if (invoker.currentConversation) {
                response.conversationId = invoker.currentConversation;
            }
            const interactionResult = await this.processResponse(response, testSuite, context);

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

            // break the loop only when the response is empty
            // regards of any error
            if (testSuite.type === CONSTANTS.TYPE.e2e
                && !response.prompt() && !response.cardTitle()
                && (response.errorOnProcess || response.isLastItemFromResults)) {
                break;
            }

            if (asyncMode && testSuite.stopTestOnFailure && (interactionResult.error || interactionResult.errors)) {
                invoker.stopProcess && await invoker.stopProcess();
                break;
            }

        }

        return results;
    }

    async resolveVariablesForAssertionInteraction(assertion, localizedValues, testSuite) {
        if (!assertion.variables || assertion.variables.length === 0) {
            return localizedValues;
        }

        for (let j = 0; j < assertion.variables.length; j++) {
            const variable = assertion.variables[j];
            const variableValue = await Util.executeFilter(testSuite.filterArray(), "resolve", variable, assertion.interaction);
            // Empty values are allowed but undefined means no replacement was found
            if (typeof variableValue == "undefined") {
                continue;
            }
            if (Array.isArray(localizedValues)) {
                localizedValues = localizedValues.map((val) => {
                    return val.split("{" + variable + "}").join(variableValue);
                });
            } else {
                localizedValues = localizedValues.split("{" + variable + "}").join(variableValue);
            }
        }

        return localizedValues;
    }

    async getLocalizedValues(testSuite, assertion) {
        if (Array.isArray(assertion.value)) {
            const localizedValues = [];
            const assertionVariables = new Set();
            for (const value of assertion.value) {
                const localizedValue = (testSuite && testSuite.getLocalizedValue(value)) || value;
                const parser = new TestParser();
                const variablesFromThisValue = parser.getDefinedVariables(localizedValue);
                if (variablesFromThisValue && variablesFromThisValue.length > 0) {
                    assertionVariables.add(...variablesFromThisValue);
                }
                localizedValues.push(localizedValue);
            }

            assertion.variables = Array.from(assertionVariables);
            if (Util.filterExist(testSuite.filterArray(), "resolve")) {
                return await this.resolveVariablesForAssertionInteraction(assertion, localizedValues, testSuite);
            }
            return localizedValues;

        } else {
            const localizedValue = (testSuite && testSuite.getLocalizedValue(assertion.value)) || assertion.value;
            const parser = new TestParser();
            assertion.variables = parser.getDefinedVariables(localizedValue);
            if (Util.filterExist(testSuite.filterArray(), "resolve")) {
                return await this.resolveVariablesForAssertionInteraction(assertion, localizedValue, testSuite);
            }

            return localizedValue;
        }

    }

    async processResponse(response, testSuite, context) {
        const interaction = response.interaction;

        // We check if a filter object is defined
        // If so, it gives the test writer a chance to make changes to the response
        await Util.executeFilter(testSuite.filterArray(), "onResponse", interaction.test, response.json);

        let result = new InteractionResult(interaction);
        let isE2EFirstError = true;
        for (const assertion of interaction.assertions) {
            if (assertion.exit) {
                result = new InteractionResult(interaction, assertion);
                break;
            }

            if (!response.supported(assertion.path)) {
                continue;
            }

            const localizedValues = await this.getLocalizedValues(testSuite, assertion);

            assertion._value = localizedValues;
            assertion._localizedValue = localizedValues;
            assertion._lenientMode = testSuite.lenientMode;
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
                if (testSuite.type === CONSTANTS.TYPE.e2e
                    && !interaction.hasGoto && !interaction.hasExit
                    && !response.errorOnProcess) {
                    if (isE2EFirstError) {
                        // We save first error data for backward compatibility
                        result = new InteractionResult(interaction, assertion, error, response.errorOnProcess);
                        isE2EFirstError = false;
                    }
                    result.addError(error);
                } else {
                    if (response.errorOnProcess) {
                        result = new InteractionResult(interaction, assertion, response.error, response.errorOnProcess);
                    } else {
                        result = new InteractionResult(interaction, assertion, error, response.errorOnProcess);
                    }
                    break;
                }
            }
        }
        if (interaction.assertions && interaction.assertions.length === 0 &&
            response.errorOnProcess) {
            result = new InteractionResult(interaction, undefined, response.error, response.errorOnProcess);
        }
        result.rawResponse = response.json;

        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log(chalk.cyan("Response Envelope:\n" + JSON.stringify(response.json, null, 2)));
        }
        if (traceOutput.isEnabled(testSuite)) {
            traceOutput.writeTraceForProcessResponse({ context, response, testSuite });
        }

        if (testSuite.ignoreExternalErrors && response.errorOnProcess) {
            LoggingErrorHelper.log("info", "bst-test", `ignoreExternalErrors is enabled. Skipping test because it failed with the following error: ${response.errorOnProcess}`);
        }

        const interactionDto = interaction.toDTO(response);
        interactionDto.result = result.toDTO();

        if (response.conversationId) {
            interactionDto.conversationId = response.conversationId;
        }
        result.interactionDto = interactionDto;

        this.emit("result", undefined, interactionDto, context);
        return result;
    }

    parseContents(fileName, testContents) {
        const parser = new TestParser();
        parser.fileName = fileName;
        parser.load(testContents);
        const suite = parser.parse();
        parser.validateIvrTests(suite);
        return suite;
    }

    // Method that can be used to print out the request payload, if available
    // TODO - should this be done with an event emitter instead?
    async filterRequest(interaction, request) {
        interaction.applyExpressions(request);

        // We check if a filter object is defined
        // If so, it gives the test writer a chance to make changes to the request
        const testSuite = interaction.test.testSuite;
        await Util.executeFilter(testSuite.filterArray(), "onRequest", interaction.test, request);

        if (testSuite.trace) {
            const test = interaction.test;
            // eslint-disable-next-line no-console
            console.log("File: " + testSuite.shortFileName + " Test: " + test.description + " Utterance: " + interaction.utterance);

            // eslint-disable-next-line no-console
            console.log(chalk.hex("#ff6633")("Request Envelope:\n" + JSON.stringify(request, null, 2)));
        }
        if (traceOutput.isEnabled(testSuite)) {
            traceOutput.writeTraceForRequestPayload({ interaction, request, testSuite });
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
                return new InteractionResult(interaction, undefined, e);
            } else if (e.message) {
                return new InteractionResult(interaction, undefined, e);
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
        testSuite._description = testSuite.getLocalizedValue(testSuite.description) || testSuite.description;

        const replaceWithLocalizedValues = value => value
            .split(" ")
            .map((word) => {
                return testSuite.getLocalizedValue(word) || word;
            })
            .join(" ");
        for (const test of testSuite.tests) {
            const localizedDescription = testSuite.getLocalizedValue(test.description) || test.description;
            test.description = localizedDescription;
            for (const interaction of test.interactions) {
                const localizedUtterance = replaceWithLocalizedValues(interaction.utterance);
                interaction.localizedUtterance = localizedUtterance;
                for (const assertion of interaction.assertions) {
                    if (_.isString(assertion.value)) {
                        assertion.localizedValue = replaceWithLocalizedValues(assertion.value);
                    } else if (_.isArray(assertion.value)) {
                        assertion.localizedValue = assertion.value.map(item => replaceWithLocalizedValues(item));
                    }
                }
            }
        }
    }
};

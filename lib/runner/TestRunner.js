const chalk = require("chalk");
const Configuration = require("./Configuration");
const fs = require("fs");
const InteractionResult = require("../test/TestResult").InteractionResult;
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
            fs.readFile(testFile, "utf8", (error, data) => {
                if (error) {
                    reject(error);
                }

                try {
                    const testSuite = this.parseContents(testFile, data);
                    resolve(this.runSuite(testSuite, context));
                } catch (e) {
                    reject(e);
                }

            });
        });
    }

    async runSuite(testSuite, context) {
        // This may have already been called, but needs to be called again inside of the Jest runner
        await Configuration.configure(this._config);
        const locale = testSuite.locale;
        if (!locale) {
            throw Error("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }

        const InvokerClass = require("./" + testSuite.invoker);
        const invoker = new InvokerClass(this);
        try {
            invoker.before(testSuite);
        } catch (error) {
            this.emit("result", error);
            return;
        }
        const batchEnabled = testSuite.batchEnabled;

        testSuite.processOnlyFlag();
        const testResults = [];
        for (const test of testSuite.tests) {
            invoker.beforeTest(test);

            const testResult = new TestResult(test);
            testResults.push(testResult);
            if (test.skip) {
                continue;
            }

            // Process through the interactions
            // If there is a goto or this is not a batch invoker, run them one-by-one
            let results;
            if (test.hasGoto || !(invoker.batchSupported() && batchEnabled)) {
                results = await this.sequentialRun(invoker, testSuite, test.interactions, context);
            } else {
                results = await this.batchRun(invoker, testSuite, test.interactions, context);
            }

            testResult.interactionResults = results;

            invoker.afterTest(test);
        }

        invoker.after(testSuite);
        return testResults;
    }

    async batchRun(invoker, testSuite, interactions, context) {
        const responses = await invoker.invokeBatch(interactions);

        // Add short-hand properties to each response
        responses.forEach((response) => response.inject());

        // Turn the responses into interaction results
        const interactionResults = responses.map((response) => this.processResponse(response, context));
        return interactionResults;
    }

    async sequentialRun(invoker, testSuite, interactions, context) {
        let goto;
        const results = [];
        for (const interaction of interactions) {
            // If a goto is set, keep skipping until we match it
            if (goto) {
                if (goto === interaction.utterance) {
                    goto = undefined;
                } else {
                    continue;
                }
            }
            this.emit("message", undefined, interaction.toDTO(), context);
            let response;
            try {
                response = await invoker.invoke(interaction);
            } catch (e) {
                const resultOnException = this.handleException(interaction, e);
                results.push(resultOnException);
                const interactionDto = interaction.toDTO();
                interactionDto.result = resultOnException.toDTO();
                this.emit("result", undefined, interactionDto, context);
                continue;
            }

            // Add short-hand properties to the response
            response.inject();

            const interactionResult = this.processResponse(response);
            if (interactionResult.goto) {
                // If this result is a goto, set the goto label
                goto = interactionResult.goto;
            }

            results.push(interactionResult);
            if (interactionResult.exited) {
                // If this is an exit, stop processing
                break;
            }
        }

        return results;
    }

    processResponse(response, context) {
        const interaction = response.interaction;
        const testSuite = interaction.test.testSuite;

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
                const error = assertion.toString(response.json);
                result = new InteractionResult(interaction, assertion, error);
                break;
            }
        }

        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log(chalk.cyan("Response Envelope:\n" + JSON.stringify(response.json, null, 2)));
        }
        const interactionDto = interaction.toDTO();
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
        if (e.message.startsWith("Unable to match utterance:")
            || e.message.startsWith("Interaction model has no intentName named")) {
            const message = Util.errorMessageWithLine(e.message, testSuite.fileName, interaction.lineNumber);
            return new InteractionResult(interaction, undefined, message);
        } else {
            return new InteractionResult(interaction, undefined, e.message + "\n" + e.stack);
        }
    }

    subscribe(event, callback) {
        if (event in this._subscribers) {
            this._subscribers[event].push(callback);
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
}

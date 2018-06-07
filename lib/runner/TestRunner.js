const chalk = require("chalk");
const Configuration = require("./Configuration");
const fs = require("fs");
const InteractionResult = require("../test/TestResult").InteractionResult;
const TestParser = require("../test/TestParser");
const TestResult = require("../test/TestResult").TestResult;
const Util = require("../util/Util");
// eslint-disable-next-line no-unused-vars
const VirtualAlexaInvoker = require("./VirtualAlexaInvoker");

module.exports = class TestRunner {
    constructor(config) {
        this._config = config;
    }

    get configuration() {
        return this._config;
    }

    async run(testFile) {
        return new Promise((resolve, reject) => {
            fs.readFile(testFile, "utf8", (error, data) => {
                if (error) {
                    reject(error);
                }

                try {
                    const testSuite = this.parseContents(testFile, data);
                    resolve(this.runSuite(testSuite));
                } catch (e) {
                    reject(e);
                }

            });
        });
    }

    async runSuite(testSuite) {
        // This may have already been called, but needs to be called again inside of the Jest runner
        await Configuration.configure();
        const locale = testSuite.locale;
        if (!locale) {
            throw Error("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }

        const InvokerClass = eval(testSuite.invoker);
        const invoker = new InvokerClass(this);
        invoker.before(testSuite);

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
            // Look for goto statements and exits, which will affect the sequence
            let goto;
            for (const interaction of test.interactions) {
                // If a goto is set, keep skipping until we match it
                if (goto) {
                    if (goto === interaction.utterance) {
                        goto = undefined;
                    } else {
                        continue;
                    }
                }

                const interactionResult = await this.interact(invoker, testSuite, test, interaction);
                if (interactionResult.goto) {
                    // If this result is a goto, set the goto label
                    goto = interactionResult.goto;
                }

                testResult.addInteractionResult(interactionResult);

                if (interactionResult.exited) {
                    // If this is an exit, stop processing
                    break;
                }
            }

            invoker.afterTest(test);
        }

        invoker.after(testSuite);
        return testResults;
    }

    async interact(invoker, testSuite, test, interaction) {
        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log("File: " +  testSuite.shortFileName + " Test: " + test.description + " Utterance: " + interaction.utterance);
        }

        let response;
        try {
            response = await invoker.invoke(interaction);
        } catch (e) {
            // We do special-handling for these errors
            if (e.message.startsWith("Unable to match utterance:")
                || e.message.startsWith("Interaction model has no intentName named")) {
                const message = Util.errorMessageWithLine(e.message, testSuite.fileName, interaction.lineNumber);
                return new InteractionResult(interaction, undefined, message);
            } else {
                return new InteractionResult(interaction, undefined, e.message + "\n" + e.stack);
            }
        }

        // Add shorthand values like prompt and re-prompt to the response
        response.inject();

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
                const error = assertion.toString(response, testSuite.fileName);
                result = new InteractionResult(interaction, assertion, error);
                break;
            }
        }

        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log(chalk.cyan("Response Envelope:\n" + JSON.stringify(response, null, 2)));
        }

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

        if (interaction.test.testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log(chalk.hex("#ff6633")("Request Envelope:\n" + JSON.stringify(request, null, 2)));
        }
    }
}


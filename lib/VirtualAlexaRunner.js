const chalk = require("chalk");
const Configuration = require("./Configuration");
const debug = require("debug")("stml.CLI");
const InteractionResult = require("./TestResult").InteractionResult;
const TestResult = require("./TestResult").TestResult;
const TestRunner = require("./TestRunner");
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaRunner extends TestRunner {
    constructor() {
        super();
    }

    async runSuite(testSuite) {
        // This may have already been called, but needs to be called again inside of the Jest runner
        await Configuration.configure();
        const locale = testSuite.locale;
        if (!locale) {
            throw Error("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }

        const virtualAlexa = new VirtualAlexa.VirtualAlexaBuilder()
            .applicationID(testSuite.applicationId)
            .interactionModelFile(testSuite.interactionModel)
            .locale(locale)
            .handler(testSuite.handler)
            .create();

        if (testSuite.address) {
            const address = testSuite.address;
            // Treat as full Address if streetAddress1 is present
            if (address.streetAddress1) {
                debug("Setting Full Address");
                virtualAlexa.addressAPI().returnsFullAddress(address);
            } else if (address.countryCode) {
                debug("Setting Country and Postal Code");
                virtualAlexa.addressAPI().returnsCountryAndPostalCode(address);
            } else {
                throw Error("Address object incomplete - please see here: https://developer.amazon.com/docs/custom-skills/device-address-api.html");
            }
        } else {
            debug("Setting Lack of Permissions for Address API");
            virtualAlexa.addressAPI().insufficientPermissions();
        }

        // Enable dynamo mock if dynamo is set to mock on
        if (testSuite.dynamo && testSuite.dynamo === "mock") {
            virtualAlexa.dynamoDB().mock();
        }

        // Set the access token if specified
        if (testSuite.accessToken) {
            virtualAlexa.context().setAccessToken(testSuite.accessToken);
        }

        // Set the device ID if specified
        if (testSuite.deviceId) {
            virtualAlexa.context().device().setID(testSuite.deviceId);
        }

        // Set the user ID if specified
        if (testSuite.userId) {
            virtualAlexa.context().user().setID(testSuite.userId + "");
        }

        const testResults = [];
        for (const test of testSuite.tests) {
            const testResult = new TestResult(test);
            testResults.push(testResult);

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

                const interactionResult = await this.interact(virtualAlexa, testSuite, test, interaction);
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
        }
        return testResults;
    }

    async interact(virtualAlexa, testSuite, test, interaction) {
        if (testSuite.trace) {
            // eslint-disable-next-line no-console
            console.log("File: " +  testSuite.shortFileName + " Test: " + test.description + " Utterance: " + interaction.utterance);
        }
        let response;

        // We always use a filter to apply expressions
        virtualAlexa.filter((request) => {
            this.applyExpressions(interaction, request);
            if (testSuite.trace) {
                // eslint-disable-next-line no-console
                console.log(chalk.hex("#ff6633")("Request:\n" + JSON.stringify(request, null, 2)));
            }
        });

        if (interaction.utterance === "LaunchRequest") {
            response = await virtualAlexa.launch();
        } else if (interaction.utterance === "SessionEndedRequest") {
            response = await virtualAlexa.endSession();
        } else {
            if (interaction.intent) {
                response = await virtualAlexa.intend(interaction.intent, interaction.slots);
            } else {
                response = await virtualAlexa.utter(interaction.utterance)
            }
        }
        
        // Add shorthand values like prompt and re-prompt to the response
        this.injectShorthandValues(response);

        let result = new InteractionResult(interaction);
        for (const assertion of interaction.assertions) {
            if (assertion.exit) {
                result = new InteractionResult(interaction, assertion);
                break;
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
            console.log(chalk.cyan("Response:\n" + JSON.stringify(response, null, 2)));
        }
        return result;
    }

    applyExpressions(interaction, request) {
        for (const expression of interaction.expressions) {
            expression.apply(request);
        }
    }

    // Adds shorthand elements to a response, if they do not already exist
    // Currently adds prompt and re-prompt, from either the text or ssml properties if they exist
    injectShorthandValues(response) {
        if (typeof response.prompt === "function") {
            response.prompt = response.prompt();
        }

        if (typeof response.reprompt === "function") {
            response.reprompt = response.reprompt();
        }
    }
}



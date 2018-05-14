const chalk = require("chalk");
const Configuration = require("./Configuration");
const debug = require("debug")("stml.CLI");
const InteractionResult = require("./TestResult").InteractionResult;
const TestResult = require("./TestResult").TestResult;
const TestRunner = require("./TestRunner");
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaRunner extends TestRunner {
    constructor(config) {
        super(config);
    }

    async runSuite(testSuite) {
        await Configuration.configure();
        const locale = testSuite.locale;
        if (!locale) {
            throw Error("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }

        const virtualAlexa = new VirtualAlexa.VirtualAlexaBuilder()
            .applicationID(testSuite.applicationId)
            .interactionModelFile(testSuite.interactionModel("models/" + locale + ".json"))
            .locale(locale)
            .handler(this.handler)
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

        if (testSuite.userId) {
            virtualAlexa.context().user().setID(testSuite.userId + "");
        }

        const testResults = [];
        for (const test of testSuite.tests) {
            const testResult = new TestResult(test);
            testResults.push(testResult);
            for (const interaction of test.interactions) {
                const interactionResult = await this.interact(virtualAlexa, testSuite, test, interaction);
                testResult.addInteractionResult(interactionResult);
            }
        }
        return testResults;
    }

    async interact(virtualAlexa, testSuite, test, interaction) {
        if (this.showPayloads) {
            // eslint-disable-next-line no-console
            console.log("File: " +  testSuite.shortFileName + " Test: " + test.description + " Utterance: " + interaction.utterance);
        }
        let response;

        // We always use a filter to apply expressions
        virtualAlexa.filter((request) => {
            this.applyExpressions(interaction, request);
            if (this.showPayloads) {
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

        let result = new InteractionResult(interaction);
        for (const assertion of interaction.assertions) {
            const passed = assertion.evaluate(response);
            if (!passed) {
                const error = assertion.toString(response, testSuite.fileName);
                result = new InteractionResult(interaction, assertion, error);
                break;
            }
        }

        if (this.showPayloads) {
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

    get handler() {
        return this._config.handler ? this._config.handler : "index.handler";
    }

    get showPayloads() {
        return (this.configuration.trace);
    }
}



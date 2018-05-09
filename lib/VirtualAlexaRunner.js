const TestResult = require("./TestResult");
const TestRunner = require("./TestRunner");
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaRunner extends TestRunner {
    constructor(config) {
        super(config);
    }

    async runSuite(testSuite) {
        const locale = testSuite.configuration.locale ? testSuite.configuration.locale : this.locale;
        if (!locale) {
            throw Error("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }

        const virtualAlexa = new VirtualAlexa.VirtualAlexaBuilder()
            .interactionModelFile(this.interactionModelFile(locale))
            .locale(locale)
            .handler(this.handler)
            .create();

        const testResults = [];
        for (const test of testSuite.tests) {
            const testResult = new TestResult(test);
            testResults.push(testResult);
            for (const interaction of test.interactions) {
                const interactionResult = await this.interact(virtualAlexa, test, interaction);
                testResult.addInteractionResult(interaction, interactionResult);
            }
        }
        return testResults;
    }

    async interact(virtualAlexa, test, interaction) {
        console.log("Running Test: " + test.description + " Utterance: " + interaction.utterance);
        let response;
        if (interaction.utterance === "LaunchRequest") {
            response = await virtualAlexa.launch();
        } else if (interaction.utterance === "SessionEndedRequest") {
            response = await virtualAlexa.endSession();
        } else {
            response = await virtualAlexa.utter(interaction.utterance)
        }

        let error;
        for (const assertion of interaction.assertions) {
            const passed = assertion.evaluate(response);
            if (!passed) {
                error = "Failed: " + assertion.toString(response);
                break;
            }
        }
        
        console.log("Response: " + JSON.stringify(response, null, 2));
        return error;
    }

    get handler() {
        return this._config.handler ? this._config.handler : "index.handler";
    }

    interactionModelFile(locale) {
        const defaultFile = "models/" + locale + ".json"
        return this._config.interactionModel ? this._config.interactionModel : defaultFile;
    }

    get locale() {
        return this.configuration.locale;
    }


}



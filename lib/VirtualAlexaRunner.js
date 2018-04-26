const TestRunner = require("./TestRunner");
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaRunner extends TestRunner {
    constructor(config) {
        super(config);
    }

    async run(testFile) {
        const virtualAlexa = new VirtualAlexa.VirtualAlexaBuilder()
            .interactionModelFile(this.interactionModelFile)
            .locale(this.locale)
            .handler(this.handler)
            .create();

        const testSuite = this.parse(testFile);
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
        if (test.utterance === "LaunchRequest") {
            response = await virtualAlexa.launch();
        } else if (test.utterance === "SessionEndedRequest") {
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

    get locale() {
        return this._config.locale;
    }

    get interactionModelFile() {
        const defaultFile = "models/" + this.locale + ".json"
        return this._config.interactionModelFile ? this._config.interactionModelFile : defaultFile;
    }
}

class TestResult {
    constructor(test) {
        this._test = test;
        this._interactionResults = [];
    }

    addInteractionResult(interaction, result) {
        this._interactionResults.push(new InteractionResult(interaction, result));
    }

    get interactionResults() {
        return this._interactionResults;
    }

    get passed() {
        let passed = true;
        for (const interactionResult of this.interactionResults) {
            if (interactionResult.error) {
                passed = false;
                break;
            }
        }
        return passed;
    }

    get errorMessages() {
        const errors = [];
        for (const result of this._interactionResults) {
            if (result.error) {
                errors.push(result.error);
            }
        }
        return errors;
    }

    get test() {
        return this._test;
    }
}

class InteractionResult {
    constructor(interaction, error) {
        this._interaction = interaction;
        this._error = error;
    }

    get interaction() {
        return this._interaction;
    }

    get passed() {
        return this._error === undefined;
    }

    get error() {
        return this._error;
    }
}



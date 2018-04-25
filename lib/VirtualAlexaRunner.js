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
        for (const test of testSuite.tests) {
            for (const interaction of test.interactions) {
                await this.interact(virtualAlexa, test, interaction);
            }
        }
    }

    async interact(virtualAlexa, test, interaction) {
        console.log("Running Test: " + test.description + " Utterance: " + interaction.utterance);
        let response;
        if (test.utterance === "LaunchRequest") {
            response = await virtualAlexa.launch();
        } else {
            response = await virtualAlexa.utter(interaction.utterance)
        }
        
        console.log("Response: " + JSON.stringify(response, null, 2));
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




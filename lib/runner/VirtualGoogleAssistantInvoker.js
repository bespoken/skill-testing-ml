const _ = require("lodash");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const Util = require("../util/Util");
const VirtualGoogleAssistant = require("virtual-google-assistant").VirtualGoogleAssistant;

module.exports = class VirtualGoogleAssistantInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    before(testSuite) {
        const builder = VirtualGoogleAssistant.Builder().directory(testSuite.dialogFlowDirectory);
        if (testSuite.expressModule) {
            this._virtualGoogleAssistant = builder
                .expressModule(testSuite.expressModule, testSuite.expressPort)
                .create();
        } else if (testSuite.actionURL) {
            this._virtualGoogleAssistant = builder
                .actionUrl(testSuite.actionURL)
                .create();
        } else {
            this._virtualGoogleAssistant = builder
                .handler(testSuite.handler)
                .create();
        }
    }

    async beforeTest() {
        try {
            await this._virtualGoogleAssistant.startExpressServer();
        } catch(e) {
            if (e !== "This instance is not using express" && e.message !== "This instance is not using express") {
                throw e;
            }
        }
    }

    async afterTest() {
        this._virtualGoogleAssistant.resetContext();
        this._virtualGoogleAssistant.resetFilters();

        try {
            await this._virtualGoogleAssistant.stopExpressServer();
        } catch(e) {
            if (e !== "This instance is not using express" && e.message !== "This instance is not using express") {
                throw e;
            }
        }
    }

    async invoke(interaction) {
        // We always use a filter to apply expressions
        this._virtualGoogleAssistant.addFilter((request) => {
            this._runner.filterRequest(interaction, request);
        });

        let response;
        if (interaction.utterance === "LaunchRequest") {
            response = await this._virtualGoogleAssistant.launch();
        } else {
            if (interaction.intent) {
                response = await this._virtualGoogleAssistant.intend(interaction.intent, interaction.slots);
            } else {
                const intent = Util.returnIntentObjectFromUtteranceIfValid(interaction.utterance);

                if (intent) {
                    try {
                        interaction.intent = intent.name;
                        interaction.slots = intent.slots;
                        response = await this._virtualGoogleAssistant.intend(interaction.intent, interaction.slots);

                    } catch (error) {
                        if (error.message && error.message.includes("Interaction model has no intentName named")) {
                            response = await this._virtualGoogleAssistant.utter(interaction.utterance);
                        }
                    }

                } else {
                    response = await this._virtualGoogleAssistant.utter(interaction.utterance);
                }
            }
        }

        return new VirtualGoogleAssistantResponse(interaction, response);
    }
};

class VirtualGoogleAssistantResponse extends InvokerResponse {
    constructor(interaction, sourceJSON) {
        super(interaction, sourceJSON);
    }

    cardContent() {
        return this.json.displayText;
    }

    cardImageURL() {
        undefined;
    }

    cardTitle() {
        return this.json.speech;
    }

    prompt() {
        const richResponse = _.get(this.json, "data.google.richResponse.items[0].simpleResponse.textToSpeech");
        const expressRichResponse = _.get(this.json, "payload.google.richResponse.items[0].simpleResponse.textToSpeech");

        const SSMLResponse = _.get(this.json, "data.google.richResponse.items[0].simpleResponse.ssml");
        const expressSSMLResponse = _.get(this.json, "data.google.richResponse.items[0].simpleResponse.ssml");

        return SSMLResponse || expressSSMLResponse || expressRichResponse || richResponse || this.json.speech;
    }

    reprompt() {
        return undefined;
    }

    supported(jsonPath) {
        const ignorePropertiesRaw = _.get(this._interaction, "test.testSuite.ignoreProperties");
        const testType = _.get(ignorePropertiesRaw, "google.type");
        let ignoredProperties = [];
        if (testType == "unit") {
            const paths = _.get(ignorePropertiesRaw, "google.paths");
            if (paths && paths.length)
                ignoredProperties = paths.split(",").map(x=> x.trim());
        }
        ignoredProperties.push("card.type");
        
        if (ignoredProperties.includes(jsonPath)){
            return false;
        }
        return true;
    }

    sessionEnded() {
        const richResponse = _.get(this.json, "data.google.expectUserResponse");

        return !(richResponse  || this.json.expectUserResponse);
    }
}



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
                    interaction.intent = intent.name;
                    interaction.slots = intent.slots;
                    response = await this._virtualGoogleAssistant.intend(interaction.intent, interaction.slots);
                } else {
                    response = await this._virtualGoogleAssistant.utter(interaction.utterance)
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

        return richResponse || this.json.speech;
    }

    reprompt() {
        return undefined;
    }

    sessionEnded() {
        const richResponse = _.get(this.json, "data.google.expectUserResponse");

        return !(richResponse  || this.json.expectUserResponse);
    }
}



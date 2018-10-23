const _ = require("lodash");
const debug = require("../util/Debug");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const Util = require("../util/Util");
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    before(testSuite) {
        const hasIntentSchema = testSuite.intentSchema && testSuite.sampleUtterances;
        // by default interactionModel has a value, if a intentSchema is provided interactionModel is set with undefined
        const interactionModel = hasIntentSchema ? undefined : testSuite.interactionModel;
        const virtualAlexaBuilder = new VirtualAlexa.VirtualAlexaBuilder()
            .applicationID(testSuite.applicationId)
            .locale(testSuite.locale)
            .interactionModelFile(interactionModel)
            .intentSchemaFile(testSuite.intentSchema)
            .sampleUtterancesFile(testSuite.sampleUtterances);

        if (testSuite.skillURL) {
            virtualAlexaBuilder.skillURL(testSuite.skillURL);
        } else {
            virtualAlexaBuilder.handler(testSuite.handler);
        }
            
        this._virtualAlexa = virtualAlexaBuilder.create();

        // Set the access token if specified
        if (testSuite.accessToken) {
            this._virtualAlexa.context().setAccessToken(testSuite.accessToken);
        }

        // Set the device ID if specified
        if (testSuite.deviceId) {
            this._virtualAlexa.context().device().setID(testSuite.deviceId);
        }

        // Set the user ID if specified
        if (testSuite.userId) {
            this._virtualAlexa.context().user().setID(testSuite.userId + "");
        }

        // NOTE - Setup mocks last - they may rely on the values set above
        // Enable dynamo mock if dynamo is set to mock on
        if (testSuite.dynamo && testSuite.dynamo === "mock") {
            this._virtualAlexa.dynamoDB().mock();
        }

        const { audioPlayerSupported, displaySupported, videoAppSupported } = testSuite.supportedInterfaces;
        this._virtualAlexa.context().device().audioPlayerSupported(audioPlayerSupported);
        this._virtualAlexa.context().device().displaySupported(displaySupported);
        this._virtualAlexa.context().device().videoAppSupported(videoAppSupported);


        if (testSuite.address) {
            const address = testSuite.address;
            // Treat as full Address if streetAddress1 is present
            if (address.addressLine1 !== undefined) {
                debug("Setting Full Address");
                this._virtualAlexa.addressAPI().returnsFullAddress(address);
            } else if (address.countryCode !== undefined) {
                debug("Setting Country and Postal Code");
                this._virtualAlexa.addressAPI().returnsCountryAndPostalCode(address);
            } else {
                throw Error("Address object incomplete - please see here: https://developer.amazon.com/docs/custom-skills/device-address-api.html");
            }
        } else {
            debug("Setting Lack of Permissions for Address API");
            this._virtualAlexa.addressAPI().insufficientPermissions();
        }
    }

    afterTest() {
        // Always end the session after a test - resets the dialog manager
        this._virtualAlexa.context().endSession();
    }

    async invokeBatch(interactions) {
        const responses = [];
        for (const interaction of interactions) {
            const response = await this.invoke(interaction);
            responses.push(response);
        }
        return responses;
    }

    async invoke(interaction) {
        // We always use a filter to apply expressions
        this._virtualAlexa.filter((request) => {
            this._runner.filterRequest(interaction, request);
        });

        let response;
        if (interaction.utterance === "LaunchRequest") {
            response = await this._virtualAlexa.launch();
        } else if (interaction.utterance.startsWith("AudioPlayer.")) {
            response = await this._virtualAlexa.audioPlayer().audioPlayerRequest(interaction.utterance);
        } else if (interaction.utterance === "SessionEndedRequest") {
            response = await this._virtualAlexa.endSession();
        } else {
            if (interaction.intent) {
                response = await this._virtualAlexa.intend(interaction.intent, interaction.localizedSlots);
            } else {
                const intent = Util.returnIntentObjectFromUtteranceIfValid(interaction.utterance);
                if (intent && this._virtualAlexa.context().interactionModel().hasIntent(intent.name)) {
                    interaction.intent = intent.name;
                    interaction.slots = intent.slots;
                    response = await this._virtualAlexa.intend(interaction.intent, interaction.localizedSlots);
                } else {
                    response = await this._virtualAlexa.utter(interaction.utterance)
                }
                
            }
        }
        return new VirtualAlexaResponse(interaction, response);
    }
}

class VirtualAlexaResponse extends InvokerResponse {
    constructor(interaction, sourceJSON) {
        super(interaction, sourceJSON);
    }

    cardContent() {
        return _.get(this.json, "response.card.content");
    }

    cardImageURL() {
        return _.get(this.json, "response.card.image.largeImageUrl");
    }

    cardTitle() {
        return _.get(this.json, "response.card.title");
    }

    prompt() {
        // Make sure this is not the prompt function
        if (typeof this.json.prompt === "function") {
            return this.json.prompt();
        } else {
            return this.json.prompt;
        }
    }

    reprompt() {
        // Make sure this is not the prompt function
        if (typeof this.json.reprompt === "function") {
            return this.json.reprompt();
        }

        return undefined;
    }

    sessionEnded() {
        return _.get(this.json, "response.shouldEndSession");
    }

    // eslint-disable-next-line no-unused-vars
    supported (path) {
        return true;
    }

    url() {
        return _.get(this.url);
    }
}



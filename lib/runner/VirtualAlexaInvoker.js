const _ = require("lodash");
const debug = require("../util/Debug");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const VirtualAlexa = require("virtual-alexa");

module.exports = class VirtualAlexaInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    before(testSuite) {
        this._virtualAlexa = new VirtualAlexa.VirtualAlexaBuilder()
            .applicationID(testSuite.applicationId)
            .interactionModelFile(testSuite.interactionModel)
            .locale(testSuite.locale)
            .handler(testSuite.handler)
            .create();


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

    async invoke(interactions) {
        const responses = [];
        for (const interaction of interactions) {
            const response = await this.invokeOne(interaction);
            responses.push(response);
        }
        return responses;
    }

    async invokeOne(interaction) {
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
                response = await this._virtualAlexa.intend(interaction.intent, interaction.slots);
            } else {
                response = await this._virtualAlexa.utter(interaction.utterance)
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

    // eslint-disable-next-line no-unused-vars
    supported (path) {
        return true;
    }
}



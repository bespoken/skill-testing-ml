const _ = require("lodash");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const VirtualDevice = require("virtual-device-sdk").VirtualDevice;

module.exports = class VirtualDeviceInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    before(testSuite) {
        const locale = testSuite.locale || undefined;
        const voiceId = testSuite.voiceId || undefined;
        this._virtualDevice = new VirtualDevice(testSuite.virtualDeviceToken, locale, voiceId);
        this._invocationName = testSuite.invocationName;
        this._lastTestDescription = "";
    }

    async invoke(interaction) {
        if (interaction.test.description !== this._lastTestDescription){
            this._lastTestDescription = interaction.test.description;
            this._isNewTestCase = true;
        }
        let message;
        if (interaction.utterance === "LaunchRequest") {
            message = `open ${this._invocationName}`;
        } else if (interaction.utterance.startsWith("AudioPlayer.")) {
            message = "";
        } else if (interaction.utterance === "SessionEndedRequest") {
            message = "exit";
        } else {
            if (this._isNewTestCase) {
                message = `ask ${this._invocationName} to ${interaction.utterance}`;
            } else {
                message = interaction.utterance;
            }
        }

        this._isNewTestCase = false;
        
        const response = await this._virtualDevice.message(message);
        return new VirtualDeviceResponse(response);
    }
}

class VirtualDeviceResponse extends InvokerResponse {
    constructor(sourceJSON) {
        super(sourceJSON);
    }

    cardContent() {
        return _.get(this.json, "card.textField");
    }

    cardImageURL() {
        return _.get(this.json, "card.imageURL");
    }

    cardTitle() {
        return _.get(this.json, "card.mainTitle");
    }

    prompt() {
        return _.get(this.json, "transcript");
    }

    reprompt() {
        return undefined;
    }

    supported (jsonPath) {
        return ["cardContent", "cardImageURL", "cardTitle", "prompt"].includes(jsonPath);
    }

    // eslint-disable-next-line no-unused-vars
    ignoreCase(jsonPath) {
        return true;
    }
}



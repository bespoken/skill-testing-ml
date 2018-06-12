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
    }

    async invoke(interaction) {
        let message;
        if (interaction.utterance === "LaunchRequest") {
            message = `open ${interaction.test.testSuite.invocationName}`;
        } else if (interaction.utterance.startsWith("AudioPlayer.")) {
            return new VirtualDeviceResponse({});
        } else if (interaction.utterance === "SessionEndedRequest") {
            message = "exit";
        } else {
            if (interaction.relativeIndex === 0) {
                message = `ask ${interaction.test.testSuite.invocationName} to ${interaction.utterance}`;
            } else {
                message = interaction.utterance;
            }
        }
        const homophones = interaction.test.testSuite.homophones;
        if (homophones) {
            const keys = Object.keys(homophones);
            for (const key of keys) {
                this._virtualDevice.addHomophones(key, homophones[key]);
            }
        }
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



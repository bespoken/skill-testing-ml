const _ = require("lodash");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const VirtualDevice = require("virtual-device-sdk").VirtualDevice;

module.exports = class VirtualDeviceInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    batchMode() {
        return true;
    }

    before(testSuite) {
        const locale = testSuite.locale || undefined;
        const voiceId = testSuite.voiceId || undefined;
        this._virtualDevice = new VirtualDevice(testSuite.virtualDeviceToken, locale, voiceId);
    }

    async invoke(interactions) {
        const messages = [];

        for (const interaction of interactions) {
            const utterance = this.convertUtterance(interaction);
            if (!utterance) {
                continue;
            }

            const message = {
                interaction: interaction,
                phrases: [],
                text: utterance,
            };

            if (interaction.assertions) {
                for (const assertion of interaction.assertions) {
                    // If this is a check on the prompt or the transcript
                    //  we add the expected value as a phrase - this helps with speech recognition
                    if ((assertion.path === "prompt" ||
                        assertion.path === "transcript")
                        && (assertion.operator === "==" ||
                            assertion.operator === "=~")) {
                        message.phrases.push(assertion.value);
                    }
                }
            }

            messages.push(message);
        }

        let results = [];
        if (messages.length > 0) {
            results = await this._virtualDevice.batchMessage(messages);
        }

        const responses = [];
        for (let i = 0 ;i < results.length; i++) {
            responses.push(new VirtualDeviceResponse(messages[i].interaction, results[i]));
        }
        return responses;
    }

    convertUtterance(interaction) {
        let utterance = interaction.utterance;
        if (interaction.utterance === "LaunchRequest") {
            utterance = `open ${interaction.test.testSuite.invocationName}`;
        } else if (interaction.utterance.startsWith("AudioPlayer.")) {
            utterance = undefined;
        } else if (interaction.utterance === "SessionEndedRequest") {
            utterance = "exit";
        } else {
            if (interaction.relativeIndex === 0) {
                utterance = `ask ${interaction.test.testSuite.invocationName} to ${interaction.utterance}`;
            }
        }
        return utterance;
    }
}

class VirtualDeviceResponse extends InvokerResponse {
    constructor(interaction, sourceJSON) {
        super(interaction, sourceJSON);
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



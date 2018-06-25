const _ = require("lodash");
const debug = require("../util/Debug");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const VirtualDevice = require("virtual-device-sdk").VirtualDevice;

module.exports = class VirtualDeviceInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    batchSupported() {
        return true;
    }

    before(testSuite) {
        const locale = testSuite.locale || undefined;
        const voiceId = testSuite.voiceId || undefined;
        if (!testSuite.invocationName) {
            throw Error("invocationName must be defined either in the skill-config.json or the test file itself under the config element");
        }
        if (!testSuite.virtualDeviceToken) {
            throw Error("virtualDeviceToken must be defined either in the skill-config.json or the test file itself under the config element");
        }

        this._virtualDevice = new VirtualDevice(testSuite.virtualDeviceToken, locale, voiceId);

        const homophones = testSuite.homophones;
        if (homophones) {
            const keys = Object.keys(homophones);
            for (const key of keys) {
                this._virtualDevice.addHomophones(key, homophones[key]);
            }
        }
    }

    async invokeBatch(interactions) {
        const messages = [];
        
        // Keep an array of the actual interactions sent, as some may be skipped
        const messageInteractions = [];
        for (const interaction of interactions) {
            const utterance = this.convertUtterance(interaction);
            if (!utterance) {
                continue;
            }

            const message = {
                phrases: [],
                text: utterance,
            };
            messageInteractions.push(interaction);

            if (interaction.assertions) {
                for (const assertion of interaction.assertions) {
                    // If this is a check on the prompt or the transcript
                    //  we add the expected value as a phrase - this helps with speech recognition
                    if ((assertion.path === "prompt" ||
                        assertion.path === "transcript")
                        && (assertion.operator === "==" ||
                            assertion.operator === "=~")) {
                        // Need to check if this is an array - the prompt assertions can specify a collection of strings
                        if (Array.isArray(assertion.value)) {
                            message.phrases = message.phrases.concat(assertion.value);
                        } else {
                            message.phrases.push(assertion.value);
                        }

                    }
                }
            }

            messages.push(message);
        }

        let results = new Array(messages.length);
        if (messages.length > 0) {
            try {
                results = await this._virtualDevice.batchMessage(messages);    
            } catch (error) {
                debug("Error: " + JSON.stringify(error));
                results.fill({});
            }
        }

        const responses = [];
        for (let i = 0 ;i < results.length; i++) {
            responses.push(new VirtualDeviceResponse(messageInteractions[i], results[i]));
        }

        if (this._virtualDevice.waitForSessionToEnd) await this._virtualDevice.waitForSessionToEnd();
        return responses;
    }

    async invoke(interaction) {
        const responses = await this.invokeBatch([interaction]);
        let response;
        if (responses && responses.length > 0) {
            response = responses[0];
        }
        return response;
    }

    convertUtterance(interaction) {
        const invocationName = interaction.test.testSuite.invocationName;
        let utterance = interaction.utterance;
        if (interaction.utterance === "LaunchRequest") {
            utterance = `open ${invocationName}`;
        } else if (interaction.utterance.startsWith("AudioPlayer.")) {
            utterance = undefined;
        } else if (interaction.utterance === "SessionEndedRequest") {
            utterance = "exit";
        } else {
            const includesInvocationNameRegex = new RegExp(`^(ask|open|launch|talk to|tell) ${invocationName}`, "i");
            const includesInvocationName = includesInvocationNameRegex.test(interaction.utterance);
            if (interaction.relativeIndex === 0 && !includesInvocationName) {
                utterance = `ask ${invocationName} to ${interaction.utterance}`;
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

    sessionEnded() {
        return undefined;
    }

    supported (jsonPath) {
        return ["cardContent", "cardImageURL", "cardTitle", "prompt"].includes(jsonPath);
    }

    // eslint-disable-next-line no-unused-vars
    ignoreCase(jsonPath) {
        return ["prompt", "transcript"].includes(jsonPath);
    }
}


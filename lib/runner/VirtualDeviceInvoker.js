const _ = require("lodash");
const CONSTANTS = require("../util/Constants");
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
        const virtualDeviceToken = testSuite.virtualDeviceToken;
        if (!virtualDeviceToken) {
            throw Error("A valid virtualDeviceToken property must be defined either in the testing.json or the yml test file under the config element");
        }

        this._virtualDevice = new VirtualDevice(virtualDeviceToken, locale, voiceId);

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
            const utterance = interaction.utterance;
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
        let errorOnProcess = undefined;
        const enableDebug = true;
        if (messages.length > 0) {
            try {
                results = await this._virtualDevice.batchMessage(messages, enableDebug);
            } catch (error) {
                debug("Error: " + JSON.stringify(error));
                results.fill({});
                errorOnProcess = this.getError(error);
            }
        }
        
        const responses = [];
        for (let i = 0 ;i < results.length; i++) {
            const virtualDeviceResponse = new VirtualDeviceResponse(messageInteractions[i], results[i]);
            if (errorOnProcess || results[i].error) {
                virtualDeviceResponse.errorOnProcess = errorOnProcess || results[i].error.message;
                responses.push(virtualDeviceResponse);
                break;    
            }
            responses.push(virtualDeviceResponse);
        }

        if (this._virtualDevice.waitForSessionToEnd) await this._virtualDevice.waitForSessionToEnd();
        return responses;
    }

    async invoke(interaction) {
        if (!interaction.utterance) {
            return;
        }

        const message = {
            phrases: [],
            text: interaction.utterance,
        };

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

        let results = new Array(1);
        let errorOnProcess = undefined;
        try {
            results = await this._virtualDevice.batchMessage([message], false);
        } catch (error) {
            debug("Error: " + JSON.stringify(error));
            results.fill({});
            errorOnProcess = this.getError(error);
        }

        const virtualDeviceResponse = new VirtualDeviceResponse(interaction, results[0]);
        if (errorOnProcess) {
            virtualDeviceResponse.errorOnProcess = errorOnProcess;
            return virtualDeviceResponse;
        }

        return virtualDeviceResponse;
    }

    getError(error){
        let objectError = undefined;
        try {
            objectError = JSON.parse(error);
        } catch (_e) {
            objectError = error;
        }

        if (typeof(objectError) === "string") {
            return objectError;
        } else if (typeof(objectError) === "object") {
            if (objectError.error) {
                if (typeof(objectError.error) === "string") {
                    return objectError.error;
                } else if (Array.isArray(objectError.error)) {
                    return objectError.error.join(", ");
                }
            }
            return "Error description missing.";
        }
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
        const platform = _.get(this._interaction, "test.testSuite.platform");
        if (platform === CONSTANTS.PLATFORM.google) {
            return ["cardContent", "prompt"].includes(jsonPath);
        }
        const includeBasicPaths = ["cardContent", "cardImageURL", "cardTitle", "prompt"].includes(jsonPath);
        
        const isDisplayPath = jsonPath.startsWith("display");
        const isRawPath = jsonPath.startsWith("raw");

        return includeBasicPaths || isDisplayPath || isRawPath;  
    }

    // eslint-disable-next-line no-unused-vars
    ignoreCase(jsonPath) {
        return ["prompt", "transcript"].includes(jsonPath);
    }
}



const _ = require("lodash");
const CONSTANTS = require("../util/Constants");
const debug = require("../util/Debug");
const FrameworkError = require("../util/FrameworkError");
const Invoker = require("./Invoker").Invoker;
const InvokerResponse = require("./Invoker").InvokerResponse;
const LoggingErrorHelper = require("../util/LoggingErrorHelper");
const sleep = require("../util/Util").sleep;
const Util = require("../util/Util");
const VirtualDevice = require("virtual-device-sdk").VirtualDevice;

let maxResponseWaitTime;
let waitInterval;

module.exports = class VirtualDeviceInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    get asyncMode() {
        return this._asyncMode;
    }

    set asyncMode(asyncMode) {
        this._asyncMode = asyncMode;
    }

    get currentConversation() {
        return this._currentConversation;
    }

    set currentConversation(currentConversation) {
        this._currentConversation = currentConversation;
    }

    batchSupported() {
        return true;
    }

    before(testSuite) {
        const locale = testSuite.locale || undefined;
        const voiceId = testSuite.voiceId || undefined;
        const virtualDeviceToken = testSuite.virtualDeviceToken;
        const virtualDeviceAsyncMode = testSuite.asyncMode;
        this.asyncMode = virtualDeviceAsyncMode;
        const deviceLocation = testSuite.deviceLocation || {};
        const stt = testSuite.stt || undefined;
        const screenMode = testSuite.screenMode;
        const client = testSuite.client;
        const projectId = testSuite.projectId;
        const phoneNumber = testSuite.phoneNumber;
        const platform = testSuite.platform;

        let extraParameters = testSuite.extraParameters || {};
        extraParameters = Util.cleanObject(extraParameters);
        maxResponseWaitTime = testSuite.maxAsyncE2EResponseWaitTime;
        waitInterval = testSuite.asyncE2EWaitInterval;

        if (!virtualDeviceToken) {
            throw new FrameworkError("A valid virtualDeviceToken property must be defined either in the testing.json or the YML test file under the config element");
        }

        if (virtualDeviceToken.includes("twilio") && !phoneNumber) {
            throw new FrameworkError("A valid phoneNumber property must be defined for IVR tests in the " +
                "testing.json or the YML test file under the config element");
        }

        const lat = Util.cleanValue(deviceLocation.lat);
        const lng = Util.cleanValue(deviceLocation.lng);
        let configuration = {
            asyncMode: virtualDeviceAsyncMode,
            client,
            locale,
            locationLat: lat,
            locationLong: lng,
            phoneNumber,
            platform,
            projectId,
            screenMode,
            stt,
            token: virtualDeviceToken,
            voiceID: voiceId,
        };
        configuration = _.assign(extraParameters, configuration);
        debug("Virtual Device instance creation: ", configuration);
        this._virtualDevice = new VirtualDevice(configuration);
        
        if (!process.env.VIRTUAL_DEVICE_BASE_URL && testSuite.virtualDeviceBaseURL) {
            debug("Setting virtual device url: ", testSuite.virtualDeviceBaseURL);
            this._virtualDevice.baseURL = testSuite.virtualDeviceBaseURL;
        }

        const homophones = testSuite.homophones;
        if (homophones) {
            const keys = Object.keys(homophones);
            for (const key of keys) {
                this._virtualDevice.addHomophones(key, homophones[key]);
            }
        }
    }

    convertInteractionsToMessages(interactions) {
        const messages = [];

        // Keep an array of the actual interactions sent, as some may be skipped
        const messageInteractions = [];
        for (const interaction of interactions) {
            const utterance = interaction.utterance;

            const message = {
                phrases: [],
                text: utterance,
            };
            messageInteractions.push(interaction);

            // Add request expressions to the body of the JSON
            // Can be used on the server to override properties
            message.settings = {};
            if (interaction.expressions) {
                interaction.expressions.map((expression) => {
                    // Remove the property request at the front of the path
                    const path = expression.path.substring("request.".length);
                    message.settings[path] = expression.value;
                });
            }
            
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
                            const phrases = assertion.value.filter(value => value.indexOf("{") === -1);
                            message.phrases = message.phrases.concat(phrases);
                        } else {
                            if (assertion.value && assertion.value.indexOf("{") === -1) {
                                message.phrases.push(assertion.value);
                            }
                        }

                    }
                }
            }

            messages.push(message);
        }
        return { messageInteractions, messages};
    }

    async invokeBatch(interactions) {
        const { messages, messageInteractions } = this.convertInteractionsToMessages(interactions);

        this._virtualDevice.addFilter((request) => {
            // For a batch response we consider only the first interaction for the filter to avoid adding multiple
            // times the same filter for only one request
            this._runner.filterRequest(interactions[0], request);
        });

        let results = [];
        let errorOnProcess = undefined;
        let errorObject = undefined;
        const enableDebug = true;
        if (messages.length > 0) {
            try {
                const response = await this._virtualDevice.batchMessage(messages, enableDebug);
                results = response.results || [];
                if (response.error) {
                    ({ errorOnProcess, errorObject, results } = this.parseError(response.error, messages.length));
                }
            } catch (error) {
                ({ errorOnProcess, errorObject, results } = this.parseError(error, messages.length));
            }
        }

        const responses = [];
        for (let i = 0 ;i < results.length; i++) {
            const virtualDeviceResponse = new VirtualDeviceResponse(messageInteractions[i], results[i]);
            if (errorOnProcess || results[i].error) {
                virtualDeviceResponse.errorOnProcess = errorOnProcess || results[i].error.message;
                virtualDeviceResponse.error = errorOnProcess ?
                    errorObject : Object.assign({}, errorObject, results[i].error);
                responses.push(virtualDeviceResponse);
                break;
            }
            responses.push(virtualDeviceResponse);
        }

        if (this._virtualDevice.waitForSessionToEnd) await this._virtualDevice.waitForSessionToEnd();
        return responses;
    }

    async sequentialInvocation(interaction) {
        if (!interaction.utterance) {
            return;
        }

        const { messages } = this.convertInteractionsToMessages([interaction]);
        const message = messages[0];

        this._virtualDevice.addFilter((request) => {
            this._runner.filterRequest(interaction, request);
        });

        let results = new Array(1);
        let errorOnProcess = undefined;
        let errorObject = {
            error_category: "system",
        };
        try {
            const response = await this._virtualDevice.batchMessage([message], true);
            results = response.results || [];
            if (response.error) {
                ({ errorOnProcess, errorObject, results } = this.parseError(response.error, 1));
            }
        } catch (error) {
            ({ errorOnProcess, errorObject, results } = this.parseError(error, 1));
        }
        const virtualDeviceResponse = new VirtualDeviceResponse(interaction, results[0]);
        if (errorOnProcess) {
            virtualDeviceResponse.errorOnProcess = errorOnProcess;
            virtualDeviceResponse.error = errorObject;
            return virtualDeviceResponse;
        } else {
            if (results[0] && results[0].error) {
                virtualDeviceResponse.error = Object.assign({}, errorObject, results[0].error);
                virtualDeviceResponse.errorOnProcess = results[0].error.message;
            }
        }

        return virtualDeviceResponse;
    }

    async batchAsyncInvocation(interaction, interactions) {
        const { messages, messageInteractions } = this.convertInteractionsToMessages(interactions);
        let asyncBatchResult;

        let errorObject = undefined;
        let errorOnProcess = undefined;
        let rawVirtualDeviceResponse;
        let totalTimeWaited = 0;
        let isCompleted = false;
        let interactionIndex = 0;
        let isLastItemFromResults = false;

        let maxResponseWaitTimePerInteraction = maxResponseWaitTime;
        let waitIntervalPerInteraction = waitInterval;
        if (interaction.hasPause) {
            const pause = interaction.pauseSeconds*1000;
            maxResponseWaitTimePerInteraction += pause;
            waitIntervalPerInteraction = pause > waitInterval ? pause : waitInterval;
            debug("Updating maxResponseWaitTime and waitInterval: ", maxResponseWaitTimePerInteraction, waitIntervalPerInteraction);
        }

        try {
            this._virtualDevice.addFilter((request) => {
                this._runner.filterRequest(interaction, request);
            });

            interactionIndex = messageInteractions.findIndex((messageInteraction) => {
                return messageInteraction.lineNumber === interaction.lineNumber;
            });

            // This is the first interaction, we send the whole list of interactions and get the conversation id
            if (interactionIndex === 0 || !this.currentConversation) {
                asyncBatchResult = await this._virtualDevice.batchMessage(messages, true);
                if (asyncBatchResult.error) {
                    throw asyncBatchResult;
                }
                this.currentConversation = asyncBatchResult.conversation_id;

                this._runner.emit("conversation_id", undefined, this.currentConversation, undefined);
                debug({"conversation_id": this.currentConversation});
            }

            // We query every 5 seconds to see if we got the current interaction results
            let isCurrentInteractionTimeoutExceed = false;
            do {
                // we query first before waiting because after the first interaction this ensure to get the responses
                // as soon as we can to the user, instead of adding 5 obligatory seconds every time if we got more than
                // one response in the same result

                const virtualDeviceResponse =
                    await this._virtualDevice.getConversationResults(this.currentConversation);

                let processedInteractions = virtualDeviceResponse.results || [];
                if (virtualDeviceResponse.error) {
                    ({ errorOnProcess, errorObject, results: processedInteractions } =
                        this.parseError(virtualDeviceResponse.error, messages.length));
                }
                if (processedInteractions.length) {
                    if (processedInteractions[interactionIndex]) {
                        // We have reached the interaction that we have at the moment

                        rawVirtualDeviceResponse = processedInteractions[interactionIndex];
                    }

                    isCompleted = processedInteractions.some((processedInteraction) => {
                        return processedInteraction.status === "COMPLETED";
                    });
                }
                isCompleted = virtualDeviceResponse.status === "COMPLETED";
                isLastItemFromResults = isCompleted && interactionIndex === processedInteractions.length - 1;

                if (totalTimeWaited >= maxResponseWaitTimePerInteraction) {
                    isCurrentInteractionTimeoutExceed = true;
                }

                if (!isCurrentInteractionTimeoutExceed && !rawVirtualDeviceResponse) {
                    await sleep(waitIntervalPerInteraction);
                    totalTimeWaited+= waitIntervalPerInteraction;
                }
            } while(!rawVirtualDeviceResponse && !isCurrentInteractionTimeoutExceed && !isCompleted);

            if (isCurrentInteractionTimeoutExceed && !rawVirtualDeviceResponse) {
                const message = "Timeout exceeded while waiting for the interaction response";
                errorObject = {
                    error_category: "system",
                    message,
                };
                errorOnProcess = message;
            }

        } catch (error) {
            const parsedError = this.parseError(error);
            errorOnProcess = parsedError.errorOnProcess;
            errorObject = parsedError.errorObject;
            if (parsedError && parsedError.results && parsedError.results.length > interactionIndex) {
                rawVirtualDeviceResponse = parsedError.results[interactionIndex];
            }
        }
        const virtualDeviceResponse = new VirtualDeviceResponse(interaction, rawVirtualDeviceResponse);
        virtualDeviceResponse.isLastItemFromResults = isLastItemFromResults;
        if (errorOnProcess) {
            virtualDeviceResponse.errorOnProcess = errorOnProcess;
            virtualDeviceResponse.error = errorObject;
        }
        return virtualDeviceResponse;
    }

    async invoke(interaction, interactions) {
        if (this.asyncMode) {
            return this.batchAsyncInvocation(interaction, interactions);
        } else {
            return this.sequentialInvocation(interaction);
        }
    }

    getErrorValues(parsedError) {
        let errorOnProcess;
        let errorObject = {};
        let results = [];
        if (parsedError.error) {
            errorOnProcess = parsedError.error;
            errorObject.message = errorOnProcess;
        } else {
            errorOnProcess = `${parsedError}`;
            errorObject.message = errorOnProcess;
        }

        if (parsedError.error_category || parsedError.errorCategory) {
            errorObject.error_category = parsedError.error_category || parsedError.errorCategory;
        }
        if (parsedError.error_code || parsedError.errorCode) {
            errorObject.error_code = parsedError.error_code || parsedError.errorCode;
        }
        if (parsedError.results) {
            results = parsedError.results;
        }
        return { errorObject, errorOnProcess, results };
    }
    
    parseError(error, numberOfMessages){
        let errorObject = {
            error_category: "system",
            error_code: 500,
            message: "Error on virtual device",
        };
        let errorOnProcess;
        let results = [];
        let errorLog = "";

        // error could a json {results, error, error_category, error_code}
        // or a plain string
        // or it could be an exception
        if (typeof(error) === "object") {
            if (Util.isErrorObject(error)) {
                errorOnProcess = "ERROR - " + (error.code || error.message) + " \nRaw message: " + error.stack;
                errorObject.message = errorOnProcess;
                errorLog = error.stack;
            } else {
                const errorValues = this.getErrorValues(error);
                errorOnProcess = errorValues.errorOnProcess;
                errorObject = Object.assign({}, errorObject, errorValues.errorObject);
                results = errorValues.results;
            }
        } else if (typeof(error) === "string") {
            try {
                const parsedError = JSON.parse(error);
                const errorValues = this.getErrorValues(parsedError);
                errorOnProcess = errorValues.errorOnProcess;
                errorObject = Object.assign({}, errorObject, errorValues.errorObject);
                results = errorValues.results;
            } catch (parseException) {
                errorOnProcess = error;
                errorObject.message = error;
            }
        }

        LoggingErrorHelper.error("bst-test", "Error using bst-test on Node: " + process.version);
        LoggingErrorHelper.error("bst-test", errorLog || errorOnProcess);
        LoggingErrorHelper.error("bst-test", JSON.stringify(errorObject));

        results = results.length > 0 ? results : new Array(numberOfMessages).fill({});
        
        return {
            errorObject,
            errorOnProcess,
            results,
        };
    }

    async stopProcess() {
        return await this._virtualDevice.stopConversation(this.currentConversation);
    }
};

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
        const ignorePropertiesRaw = _.get(this._interaction, "test.testSuite.ignoreProperties");
        const testType = _.get(ignorePropertiesRaw, `${platform}.type`);

        let ignoredProperties = [];
        if (testType == "e2e") {
            const paths = _.get(ignorePropertiesRaw, `${platform}.paths`);
            if (paths && paths.length)
                ignoredProperties = paths.split(",").map(x=> x.trim());
        }

        if (platform === CONSTANTS.PLATFORM.google){
            ignoredProperties.push("card.type");
            ignoredProperties.push("streamURL");
        }

        if (ignoredProperties.includes(jsonPath)){
            return false;
        }

        return true;
    }

    // eslint-disable-next-line no-unused-vars
    ignoreCase(jsonPath) {
        return ["prompt", "transcript"].includes(jsonPath);
    }
}



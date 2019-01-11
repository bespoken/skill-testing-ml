const _ = require("lodash");
const FrameworkError = require("../util/FrameworkError");
const invoker = require("./Invoker");
const SMAPI = require("../util/SMAPI");

module.exports = class SMAPIInvoker extends invoker.Invoker {
    async before(testSuite) {
        let skillId = testSuite.skillId;
        if (!skillId) {
            // Try getting the skill ID from the project .ask/config file
            skillId = SMAPI.fetchSkillIdFromConfig();    
        }

        if (!skillId) {
            throw new FrameworkError("To use SMAPI, skillId must be specified in one of the following:\n"
                + "1) testing.json\n" 
                + "2) configuration element\n" 
                + "3) .ask/config file for the project");
        }

        let stage = testSuite.stage;
        if (!stage) {
            throw new FrameworkError("To use SMAPI, stage must be specified in one of the following:\n"
                + "1) testing.json\n" 
                + "2) configuration element");
        } else if (["live", "development"].indexOf(stage) === -1) {
            throw new FrameworkError("stage accepted values are development and live.");
        }

        // We need a SMAPI access token. First we prefer to get it using our virtual device token
        // If that does not work, we try the ASK config file
        let accessToken;
        let fromCLI = false;
        // Commented out for now, as these tokens do not work
        // if (testSuite.virtualDeviceToken) {
        //     accessToken = await SMAPI.fetchAccessTokenFromServer(testSuite.virtualDeviceToken);
        // }

        if (!accessToken) {
            accessToken = SMAPI.fetchAccessTokenFromConfig();
            fromCLI = true;
        }

        if (!accessToken) {
            throw new FrameworkError("To use SMAPI Simulate, you must configure ASK CLI on the machine.\n" +
                "The default profile will be used unless ASK_DEFAULT_PROFILE environment variable is set");
        }
        this.smapi = new SMAPI(accessToken, skillId, stage, testSuite.locale, fromCLI);
    }

    beforeTest() {
        // Reset first interaction variable before each test
        this.firstInteraction = true;
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
        const newSession = this.firstInteraction;
        const result = await this.smapi.simulate(interaction.utterance, newSession);
        this.firstInteraction = false;
        return new SMAPIInvokerResponse(interaction, result);
    }
};

class SMAPIInvokerResponse extends invoker.InvokerResponse {
    constructor(interaction, sourceJSON) {
        // We move the JSON around a bit
        if (sourceJSON.status === "FAILED") {
            throw new FrameworkError("SMAPI Simulation Error: " + sourceJSON.result.error.message);    
        }

        const skillResponse = sourceJSON.result.skillExecutionInfo.invocations[0].invocationResponse.body;
        
        // Delete the body element so we do not end up with a circular reference
        delete sourceJSON.result.skillExecutionInfo.invocations[0].invocationResponse.body;
        
        // Move the root response onto the raw element, for access to other pieces if needed
        skillResponse.raw = sourceJSON;
        super(interaction, skillResponse);
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
        return _.get(this.json, "response.outputSpeech.ssml", _.get(this.json, "response.outputSpeech.text"));
    }

    reprompt() {
        return _.get(this.json, "response.reprompt.outputSpeech.ssml", _.get(this.json, "response.reprompt.outputSpeech.text"));
    }

    sessionEnded() {
        return _.get(this.json, "response.shouldEndSession");
    }

    supported () {
        return true;
    }
}
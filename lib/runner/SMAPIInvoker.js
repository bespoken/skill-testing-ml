const _ = require("lodash");
const invoker = require("./Invoker");
const SMAPI = require("../util/SMAPI");

module.exports = class SMAPIInvoker extends invoker.Invoker {
    before(testSuite) {
        let skillId = testSuite.skillId;
        if (!skillId) {
            // Try getting the skill ID from the project .ask/config file
            skillId = SMAPI.fetchSkillIdFromConfig();    
        }

        if (!skillId) {
            throw Error("skillId must be specified in either\n"
                + "1) testing.json\n" 
                + "2) configuration element\n" 
                + "3) .ask/config file for the project");
        }
        
        const accessToken = SMAPI.fetchAccessTokenFromConfig();
        // eslint-disable-next-line no-console
        console.log("TOKEN: " + accessToken);
        this.smapi = new SMAPI(accessToken, skillId, testSuite.locale);
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
}

class SMAPIInvokerResponse extends invoker.InvokerResponse {
    constructor(interaction, sourceJSON) {
        // We move the JSON around a bit
        const skillResponse = sourceJSON.result.skillExecutionInfo.invocationResponse.body;
        
        // Delete the body element so we do not end up with a circular reference
        delete sourceJSON.result.skillExecutionInfo.invocationResponse.body;
        
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
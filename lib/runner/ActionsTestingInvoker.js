const _ = require("lodash");
const ActionsOnGoogleTestManager = require("assistant-conversation-testing").ActionsOnGoogleTestManager;
const Configuration = require("../runner/Configuration");
const { Invoker, InvokerResponse } = require("./invoker");

module.exports = class ActionsTestingInvoker extends Invoker {
    constructor(runner) {
        super(runner);
    }

    before(suite) {
        this.testManager = new ActionsOnGoogleTestManager();
        const projectID = this._config(suite, "projectID");
        
        this.testManager.setupSuite(
            projectID,
            false,
            -1);
        this.testManager.setSuiteLocale(suite.locale);
        this.testManager.setSuiteSurface("PHONE");
    }

    async invoke(interaction) {
    // We always use a filter to apply expressions
    // await this._runner.filterRequest(interaction, request);
    
        let response = await this.testManager.sendQuery(interaction.utterance);

        // console.info('Response: ' + JSON.stringify(response.getLatestResponse(), null, 2))
        return new ActionsTestingResponse(interaction, response);
    }

    _config(suite, key) {
        return Configuration.instance().value(key, suite.configuration);
    }
};

class ActionsTestingResponse extends InvokerResponse {
    constructor(interaction, actionsResponse) {
        super(interaction, actionsResponse);
    }

    cardContent() {
        return  _.get(this, "firstPrompt.content.card.title");
    }

    cardImageURL() {
        return  _.get(this, "firstPrompt.content.card.image.url");
    }

    cardTitle() {
        return  _.get(this, "firstPrompt.content.card.title");
    }

    prompt() {
        return _.nth(this.json.output.speech, 0);
    }

    reprompt() {
        return _.nth(this.json.output.speech, 1);
    }

    supported() {
        return true;
    }

    sessionEnded() {
        return _.get(this, "lastEvent.endConversation") !== undefined;
    }

    get lastEvent() {
        return _.nth(_.get(this, "json.diagnostics.actionsBuilderEvents"), -1);
    }
  
    get firstPrompt() {
        return _.nth(_.get(this, "lastEvent.executionState.promptQueue"), 0);
    }
}
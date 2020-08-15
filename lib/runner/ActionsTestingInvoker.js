const _ = require('lodash')
const Configuration = require("../runner/Configuration");
const { Invoker, InvokerResponse } = require('./invoker')
const ActionsOnGoogleTestManager = require('assistant-conversation-testing').ActionsOnGoogleTestManager

module.exports = class ActionsTestingInvoker extends Invoker {
  constructor(runner) {
    super(runner);
  }

  before(suite) {
    this.testManager = new ActionsOnGoogleTestManager();
    const projectID = this._config(suite, "projectID")
    console.info('Project ID: ' + projectID)

    this.testManager.setupSuite(
        projectID,
        false,
        -1);
    this.testManager.setSuiteLocale(suite.locale);
    this.testManager.setSuiteSurface('PHONE');
  }

  async invoke(interaction) {
    // We always use a filter to apply expressions
    // await this._runner.filterRequest(interaction, request);
    
    let response = await this.testManager.sendQuery(interaction.utterance)

    // console.info('Response: ' + JSON.stringify(response.getLatestResponse(), null, 2))
    return new ActionsTestingResponse(interaction, response);
  }

  _config(suite, key) {
    return Configuration.instance().value(key, suite.configuration);
  }
}

class ActionsTestingResponse extends InvokerResponse {
  constructor(interaction, actionsResponse) {
      super(interaction, actionsResponse);
  }

  cardContent() {
      return this.json.output.text
  }

  cardImageURL() {
      return undefined
  }

  cardTitle() {
      return this.json.output.text
  }

  prompt() {
      return this.json.output.speech[0]
  }

  reprompt() {
      return _.nth(this.json.output.speech, 1)
  }

  supported(jsonPath) {
      return true;
  }

  sessionEnded() {
    return false
  }
}
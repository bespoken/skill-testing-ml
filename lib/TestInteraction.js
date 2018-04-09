const _ = require("lodash");

const REQUEST_TYPES = ["Display.ElementSelected", "LaunchRequest", "SessionEndedRequest"];

module.exports = class TestInteraction {
    constructor(utterance, intent, slots, requestExpressions, assertions) {
        this._utterance = utterance;
        this._intent = intent;
        this._slots = slots;
        this._requestExpressions = requestExpressions;
        this._assertions = assertions;
    }

    get assertions() {
        return this._assertions;
    }

    get requestType() {
        if (REQUEST_TYPES.includes(this._utterance)) {
            return this._utterance;
        }

        return undefined;
    }

    get utterance() {
        return this._utterance;
    }
}
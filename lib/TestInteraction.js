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

    get expressions() {
        return this._requestExpressions;
    }

    get intent() {
        return this._intent;
    }

    get slots() {
        return this._slots;
    }

    get requestType() {
        if (REQUEST_TYPES.includes(this._utterance)) {
            return this._utterance;
        }

        return undefined;
    }

    get utterance() {
        return this._utterance + "";
    }
}
const REQUEST_TYPES = ["Display.ElementSelected", "LaunchRequest", "SessionEndedRequest"];

module.exports = class TestInteraction {
    constructor(test, utterance) {
        this._test = test;
        this._utterance = utterance;
        this._requestExpressions = [];
        this._assertions = [];
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

    set intent(intent) {
        this._intent = intent;
    }

    get lineNumber() {
        return this._lineNumber;
    }

    set lineNumber(lineNumber) {
        this._lineNumber = lineNumber;
    }

    get requestType() {
        if (REQUEST_TYPES.includes(this._utterance)) {
            return this._utterance;
        }

        return undefined;
    }

    get slots() {
        return this._slots;
    }

    set slots(slots) {
        this._slots = slots;
    }

    get test() {
        return this._test;
    }

    get utterance() {
        return this._utterance + "";
    }

    set utterance(utterance) {
        this._utterance = utterance;
    }

    applyExpressions(request) {
        for (const expression of this.expressions) {
            expression.apply(request);
        }
    }

    get relativeIndex() {
        return this._relativeIndex;
    }

    set relativeIndex(index) {
        this._relativeIndex = index;
    }
}
module.exports = class TestResult {
    constructor(test) {
        this._test = test;
        this._interactionResults = [];
    }

    addInteractionResult(interaction, result) {
        this._interactionResults.push(new InteractionResult(interaction, result));
    }

    get interactionResults() {
        return this._interactionResults;
    }

    get passed() {
        let passed = true;
        for (const interactionResult of this.interactionResults) {
            if (interactionResult.error) {
                passed = false;
                break;
            }
        }
        return passed;
    }

    get errorMessages() {
        const errors = [];
        for (const result of this._interactionResults) {
            if (result.error) {
                errors.push(result.error);
            }
        }
        return errors;
    }

    get test() {
        return this._test;
    }
}

class InteractionResult {
    constructor(interaction, error) {
        this._interaction = interaction;
        this._error = error;
    }

    get interaction() {
        return this._interaction;
    }

    get passed() {
        return this._error === undefined;
    }

    get error() {
        return this._error;
    }
}
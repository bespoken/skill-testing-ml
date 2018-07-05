exports.TestResult = class TestResult {
    constructor(test) {
        this._test = test;
        this._interactionResults = [];
    }

    addInteractionResult(interactionResult) {
        this._interactionResults.push(interactionResult);
    }

    get interactionResults() {
        return this._interactionResults;
    }

    set interactionResults(results) {
        this._interactionResults = results;
    }

    get skipped() {
        return this._test.skip;
    }

    get passed() {
        for (const result of this.interactionResults) {
            if (!result.passed) {
                return false;
            }
        }
        return true;
    }

    get test() {
        return this._test;
    }

    get locale() {
        return this._locale;
    }

    set locale(locale) {
        this._locale = locale;
    }
}

exports.InteractionResult = class InteractionResult {
    constructor(interaction, assertion, error) {
        this._interaction = interaction;
        this._assertion = assertion;
        this._error = error;
    }

    get interaction() {
        return this._interaction;
    }

    get assertion() {
        return this._assertion;
    }

    get goto() {
        if (this._assertion && this._assertion.goto) {
            return this._assertion.goto;
        }
        return undefined;
    }

    get exited() {
        return this._assertion && this._assertion.exit;
    }

    get passed() {
        return this._error === undefined;
    }

    get error() {
        return this._error;
    }

    get errorMessage() {
        if (this._error && this._error instanceof Error) {
            return this._error.message + "\n" + this._error.stack;
        }
        return this._error;
    }

    toDTO() {
        return {
            errorMessage: this.errorMessage,
            exited: this.exited,
            passed: this.passed,
        }
    }
}
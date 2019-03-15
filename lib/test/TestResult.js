
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
        if (this.test && this.test.testSuite && this.test.testSuite.ignoreExternalErrors) {
            const errorOnProcess = this.interactionResults.some(r => r.errorOnProcess);
            return this.test.skip || errorOnProcess;
        }
        return this.test.skip;
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
};

exports.InteractionResult = class InteractionResult {
    constructor(interaction, assertion, error, errorOnProcess, timestamp) {
        this._interaction = interaction;
        this._assertion = assertion;
        this._error = error;
        this._errorOnProcess = errorOnProcess;
        this._timestamp = timestamp ? timestamp : new Date();
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

    get errorOnProcess() {
        return this._errorOnProcess;
    }

    get errorMessage() {
        if (this._error && this._error instanceof Error) {
            return this._error.message + "\n" + this._error.stack;
        }
        return this._error;
    }

    get timestamp() {
        return this._timestamp;
    }

    set rawResponse(value) {
        this._rawResponse = value;
    }

    toDTO() {
        return {
            errorMessage: this.errorMessage,
            exited: this.exited,
            passed: this.passed,
            rawResponse: this._rawResponse,
        };
    }
};
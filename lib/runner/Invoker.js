/* eslint-disable no-unused-vars */

// Class that must be implemented by any test method
// Invoker contains the template methods that must implemented
// The life-cycle of an invoker is for a test suite - it is thrown away at the end of executing the suite
exports.Invoker = class Invoker {
    constructor(runner) {
        this._runner = runner;
    }

    // Returns an implementation of ResponseMapper tailored to the invoker
    async invoke() {
        return Promise.reject("This method must be implemented");
    }

    after(testSuite) {
        // Do whatever is necessary on teardown of the invoker
    }

    afterTest(test) {
        // Do whatever is necessary after the test
    }

    before(testSuite) {
        // Do whatever is necessary to setup the invoker for the test suite
    }

    beforeTest(test) {
        // DO whatever is necessary to setup the invoker for the test
    }
}

// InvokerResponse contains the response elements that should be handled
// Values that are available listed in an array in the provides method
exports.InvokerResponse = class InvokerResponse {
    constructor(sourceJSON) {
        this._sourceJSON = sourceJSON;
    }

    get json() {
        return this._sourceJSON;
    }

    cardContent() {
        throw unsupportedError();
    }

    cardImageURL() {
        throw unsupportedError();
    }

    cardTitle() {
        throw unsupportedError();
    }

    prompt() {
        throw unsupportedError();
    }

    reprompt() {
        throw unsupportedError();
    }

    // Injects the core fields into the JSON
    inject() {
        this.json.cardContent = this.cardContent();
        this.json.cardImageURL = this.cardImageURL();
        this.json.cardTitle = this.cardTitle();
        this.json.prompt = this.prompt();
        this.json.reprompt = this.reprompt();
    }

    // Returns whether or not the specific JSON path is supported by this response
    // If a field is not supported, assertions referencing it are ignored
    // Defaults to returning true for the core fields
    supported(jsonPath) {
        return ["cardContent", "cardImageURL", "cardTitle", "prompt", "reprompt"].includes(jsonPath);
    }
}

function unsupportedError () {
    return new Error("Unimplemented function - should either be implemented or not listed under supported");
}
module.exports = class TestSuite {
    constructor(fileName, configuration, tests) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
    }

    get configuration() {
        return this._configuration;
    }

    get fileName() {
        return this._fileName;
    }

    get tests() {
        return this._tests;
    }
}
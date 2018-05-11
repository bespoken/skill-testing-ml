const path = require("path");

module.exports = class TestSuite {
    constructor(fileName, configuration, tests) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
    }

    get address() {
        return this.configuration.address;
    }

    get configuration() {
        return this._configuration;
    }

    get fileName() {
        return this._fileName;
    }

    get shortFileName() {
        return path.basename(this._fileName);
    }

    set fileName(name) {
        this._fileName = name;
    }

    get tests() {
        return this._tests;
    }
}
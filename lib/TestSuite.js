const Configuration = require("./Configuration");
const path = require("path");

module.exports = class TestSuite {
    constructor(fileName, configuration, tests) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
    }

    get accountToken() {
        return Configuration.instance().value("accountToken", this.configuration);
    }

    get address() {
        return this.configuration && this.configuration.address;
    }

    get applicationId() {
        return Configuration.instance().value("applicationId", this.configuration);
    }

    get configuration() {
        return this._configuration;
    }

    get deviceId() {
        return Configuration.instance().value("deviceId", this.configuration);
    }

    get dynamo() {
        return this.configuration && this.configuration.dynamo;
    }

    get fileName() {
        return this._fileName;
    }

    get handler() {
        return Configuration.instance().value("handler", this.configuration, "index.handler");
    }

    set fileName(name) {
        this._fileName = name;
    }

    get interactionModel() {
        const defaultValue = "models/" + this.locale + ".json";
        return Configuration.instance().value("interactionModel", this.configuration, defaultValue);
    }

    get locale() {
        return Configuration.instance().value("locale", this.configuration);
    }

    get shortFileName() {
        return path.basename(this._fileName);
    }

    get tests() {
        return this._tests;
    }

    get trace() {
        return Configuration.instance().value("trace", this.configuration);
    }

    get userId() {
        return Configuration.instance().value("userId", this.configuration);
    }
}
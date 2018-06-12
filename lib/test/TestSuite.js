const Configuration = require("../runner/Configuration");
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
        return Configuration.instance().value("address", this.configuration);
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
        return Configuration.instance().value("dynamo", this.configuration);
    }

    get fileName() {
        return this._fileName;
    }

    set fileName(name) {
        this._fileName = name;
    }

    get handler() {
        return Configuration.instance().value("handler", this.configuration, "index.handler");
    }

    get interactionModel() {
        const defaultValue = "models/" + this.locale + ".json";
        return Configuration.instance().value("interactionModel", this.configuration, defaultValue);
    }

    get invocationName() {
        return Configuration.instance().value("invocationName", this.configuration);
    }

    get invoker() {
        return Configuration.instance().value("invoker", this.configuration, "VirtualAlexaInvoker");
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

    set tests(tests) {
        this._tests = tests;
    }

    get trace() {
        return Configuration.instance().value("trace", this.configuration);
    }

    get userId() {
        return Configuration.instance().value("userId", this.configuration);
    }

    get virtualDeviceToken() {
        return Configuration.instance().value("virtualDeviceToken", this.configuration);
    }

    // Process the skip and only flags
    processOnlyFlag() {
        const hasOnly = (this.tests.find(test => test.only));
        if (!hasOnly) {
            return;
        }

        // If there are only tests, flag everything that is not as skipped
        for (const test of this.tests) {
            if (!test.only) {
                test.skip = true;
            }
        }
    }
}
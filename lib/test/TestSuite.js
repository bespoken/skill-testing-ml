const Configuration = require("../runner/Configuration");
const path = require("path");

module.exports = class TestSuite {
    constructor(fileName, configuration, tests) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
    }

    get filter() {
        return Configuration.instance().value("filter", this.configuration);
    }

    get intentSchema() {
        return Configuration.instance().value("intentSchema", this.configuration);
    }

    get sampleUtterances() {
        return Configuration.instance().value("sampleUtterances", this.configuration);
    }

    get skillURL() {
        return Configuration.instance().value("skillURL", this.configuration);
    }
    
    get homophones() {
        return Configuration.instance().value("homophones", this.configuration);
    }

    get accessToken() {
        return Configuration.instance().value("accessToken", this.configuration);
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

    filterObject() {
        let filterModule = this.filter;
        let filterObject;
        if (filterModule) {
            filterModule = path.join(process.cwd(), filterModule);
            try {
                filterObject = require(filterModule);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("Filter specified - but filter module not found at: " + filterModule);
            }
        }

        return filterObject;
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
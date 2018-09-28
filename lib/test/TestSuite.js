const Configuration = require("../runner/Configuration");
const path = require("path");
const Util = require("../util/Util");

module.exports = class TestSuite {
    constructor(fileName, configuration, tests, localizedValues) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
        this._localizedValues = localizedValues;
    }

    get dialogFlowDirectory() {
        return Configuration.instance().value("dialogFlowDirectory", this.configuration);
    }

    get expressModule() {
        return Configuration.instance().value("expressModule", this.configuration);
    }

    get expressPort() {
        return Configuration.instance().value("expressPort", this.configuration);
    }

    get filter() {
        return Configuration.instance().value("filter", this.configuration);
    }

    get voiceId() {
        return Configuration.instance().value("voiceId", this.configuration);
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
        const handlerPath = Configuration.instance().value("handler", this.configuration);
        if (handlerPath) {
            return this.resolvePath(handlerPath);
        }
        return "./index.handler";

    }

    get interactionModel() {
        if (this.testDirectory) {
            return `${this.testDirectory}/models/${this.locale}.json`;
        }
        const defaultValue = `./models/${this.locale}.json`;
        const interactionModelPath = Configuration.instance().value("interactionModel", this.configuration);
        if (interactionModelPath) {
            return this.resolvePath(interactionModelPath); 
        }
        return defaultValue;
    }

    resolvePath(pathToResolve) {
        const configurationPath = Configuration.instance().value("configurationPath", this.configuration) || "";
        const configDirectory = path.dirname(configurationPath);
        const relativePath = path.relative(process.cwd(), configDirectory);
        return path.join(relativePath, pathToResolve);
    }

    get invocationName() {
        return Configuration.instance().value("invocationName", this.configuration);
    }

    get invoker() {
        return Configuration.instance().value("invoker", this.configuration);
    }

    get locale() {
        if (this._currentLocale) return this._currentLocale;
        return Configuration.instance().value("locale", this.configuration);
    }

    get platform() {
        return Configuration.instance().value("platform", this.configuration, "alexa");
    }

    get type() {
        return Configuration.instance().value("type", this.configuration, "unit");
    }

    get locales() {
        return Configuration.instance().value("locales", this.configuration);
    }

    get shortFileName() {
        return path.basename(this._fileName);
    }

    get testDirectory() {
        /// By default we look for files in the root folder
        /// if testDirectory is set, this path will be used instead
        /// right now useful for testing
        return Configuration.instance().value("testDirectory", this.configuration);
    }

    get directory() {
        return path.dirname(this._fileName);
    }

    get tests() {
        return this._tests;
    }

    set tests(tests) {
        this._tests = tests;
    }

    get localizedValues() {
        return this._localizedValues;
    }

    set localizedValues(localizedValues) {
        this._localizedValues = localizedValues;
    }

    get trace() {
        return Configuration.instance().value("trace", this.configuration);
    }

    get userId() {
        return Configuration.instance().value("userId", this.configuration);
    }

    get supportedInterfaces() {
        let audioPlayerSupported = true;
        let displaySupported = true;
        let videoAppSupported = true;
        const interfacesList = Configuration.instance().value("supportedInterfaces", this.configuration);
        if (interfacesList) {
            const interfaces = interfacesList.split(",").map(i => i.trim());
            audioPlayerSupported = interfaces.indexOf("AudioPlayer") >= 0;
            displaySupported = interfaces.indexOf("Display") >= 0;
            videoAppSupported = interfaces.indexOf("VideoApp") >= 0;

        }
        return { audioPlayerSupported, displaySupported, videoAppSupported };
    }

    get virtualDeviceToken() {
        const platform = this.platform;
        const locale = this.locale;
        const token = Configuration.instance().value("virtualDeviceToken", this.configuration);
        if (typeof token === "object") {
            if (platform in token) {
                if (typeof token[platform] === "object" && locale in token[platform]) {
                    return token[platform][locale];
                } else if (typeof token[platform] === "string") {
                    return token[platform];
                }
            }
        } else if (typeof token === "string") {
            return token;
        }
        return undefined;
    }

    get batchEnabled() {
        return Configuration.instance().value("batchEnabled", this.configuration, true);
    }

    getLocalizedValue(key) {
        if (!this._localizedValues || !this.locale) return undefined;
        let localizedValue = this._localizedValues[this.locale] && this._localizedValues[this.locale][key];
        if (localizedValue) return localizedValue;

        const language = this.locale.split("-")[0];
        localizedValue = this._localizedValues[language] && this._localizedValues[language][key];
        if (localizedValue) return localizedValue;

        return undefined;
    }

    filterObject() {
        let filterModule = this.filter;
        if (typeof this.filter === "string") {
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
        } else {
            return this.filter;
        }
    }

    getTagsFromString(tagsAsString) {
        if (!Util.isString(tagsAsString)) {
            return [];
        }
        return  tagsAsString.split(",").map(tag => tag.trim());
    }

    // Process the include and exclude flags and turn them to skip's and only's
    processIncludedAndExcludedTags() {
        const includedTagsRaw =  Configuration.instance().value("includedTags", this.configuration, "");
        const excludedTagsRaw =  Configuration.instance().value("excludedTags", this.configuration, "");

        const includedTags = this.getTagsFromString(includedTagsRaw);
        const excludedTags = this.getTagsFromString(excludedTagsRaw);

        this.tests = this.tests.map(test => {
            if (!test.tags || test.tags.length === 0) {
                return test;
            }

            const isTheTestIncluded = test.tags.some(tag => includedTags.includes(tag));
            const isTheTestExcluded = test.tags.some(tag => excludedTags.includes(tag));

            if (isTheTestExcluded) {
                test.skip = true;
            }

            if (isTheTestIncluded) {
                test.only = true;
            }

            return test;
        })
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

    set currentLocale(currentLocale) {
        this._currentLocale = currentLocale;
    }

    async loadLocalizedValues() {
        let tries = 1;
        let files = [];
        let localesPath = `${this.directory}`;
        while (tries < 3 && files.length === 0) {
            files = await Util.readFiles(`${localesPath}/locales/`);
            tries++;
            localesPath = path.join(localesPath, "..");
        }
        // Files is an array of objects {filename, content}
        // reduce method will iterate the array and return an object
        // where the keys will be the file name without extension
        // and the value will be a key value object with the localization values
        this._localizedValues = files.reduce((accumulator, item) => {
            if (!item) return accumulator;

            const language = path.basename(item.filename, ".yml");
            accumulator[language] = item.content.split("\n").reduce((accumulatorC, itemC) => {
                if (!itemC) return accumulatorC;
                const [key, value] = itemC.split(":");
                if (key && value) {
                    accumulatorC[key] = value.trim();
                }
                return accumulatorC;
            }, {});
            return accumulator;
        }, {});
    }

    get rawTestContent() {
        return this._rawTestContent;
    }

    set rawTestContent(rawTestContent) {
        this._rawTestContent = rawTestContent;
    }

}

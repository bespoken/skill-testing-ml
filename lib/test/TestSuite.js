const Configuration = require("../runner/Configuration");
const path = require("path");
const Util = require("../util/Util");

/**
 * Represent a complete test suite
 */
class TestSuite {
    /**
     *
     * @param {string} fileName - The file where this test suite was defined.
     * @param {object} configuration - Complete configuration set up for the test suite
     * @param {Test[]} tests - Array of tests inside this test suite
     * @param {object[]} localizedValues - Array of objects {key, value} where the keys are the file name without
     * extension and the value is a key value object with the localization values
     */
    constructor(fileName, configuration, tests, localizedValues) {
        this._configuration = configuration;
        this._fileName = fileName;
        this._tests = tests;
        this._localizedValues = localizedValues;
    }

    /**
     * Get the Dialog Flow imported project directory
     * @return {string} The Dialog Flow imported project directory path
     */
    get dialogFlowDirectory() {
        return Configuration.instance().value("dialogFlowDirectory", this.configuration);
    }

    /**
     * Get the express module configured for Google Assistant Unit tests if it exists
     * @return {string} the express module configured for Virtual Google Assistant
     */
    get expressModule() {
        return Configuration.instance().value("expressModule", this.configuration);
    }

    /**
     * Get the express port configured for Google Assistant Unit tests if it exists
     * @return {number} the express port configured for Virtual Google Assistant
     */
    get expressPort() {
        return Configuration.instance().value("expressPort", this.configuration);
    }

    /**
     * Get the filter path
     * @return {string} the filter path
     */
    get filter() {
        return Configuration.instance().value("filter", this.configuration);
    }

    /**
     * Get the voice id for e2e tests
     * @return {string} the voice id for e2e tests
     */
    get voiceId() {
        return Configuration.instance().value("voiceId", this.configuration);
    }

    /**
     * Get the intent schema path for Alexa unit tests
     * @return {string} the intent schema path
     */
    get intentSchema() {
        return Configuration.instance().value("intentSchema", this.configuration);
    }

    /**
     * Get the list of tags that won't be run
     * @return {string[]} the list of tags that won't be run
     */
    get exclude() {
        return Configuration.instance().value("exclude", this.configuration);
    }

    /**
     * Get the list of tags that will be run, all other tests will be excluded
     * @return {string[]} the list of tags that will be run
     */
    get include() {
        return Configuration.instance().value("include", this.configuration);
    }

    /**
     * Get the sample utterances path for Alexa unit tests
     * @return {string} the sample utterances path
     */
    get sampleUtterances() {
        return Configuration.instance().value("sampleUtterances", this.configuration);
    }

    /**
     * Get the URL for the skill for Alexa unit tests
     * @return {string} the URL for the skill
     */
    get skillURL() {
        return Configuration.instance().value("skillURL", this.configuration);
    }

    /**
     * Get the URL for the action for Google Assistant unit tests
     * @return {string} the URL for the action
     */
    get actionURL() {
        return Configuration.instance().value("actionURL", this.configuration);
    }

    /**
     * Get the list of homophones for e2e testing
     * @return {object[]} the list of homophones
     */
    get homophones() {
        return Configuration.instance().value("homophones", this.configuration);
    }

    /**
     * Get the access token for SMAPI e2e testing
     * @return {string} the access token
     */
    get accessToken() {
        return Configuration.instance().value("accessToken", this.configuration);
    }

    /**
     * Get the address object for Alexa unit testing to use as mock in the address API
     * @return {object} the address object
     */
    get address() {
        return Configuration.instance().value("address", this.configuration);
    }

    /**
     * Get the applicationId for Alexa unit testing to set in the requests
     * @return {string} the applicationId
     */
    get applicationId() {
        return Configuration.instance().value("applicationId", this.configuration);
    }

    /**
     * Get the time waited before attempting to obtain new results in e2e tests that are running in async mode
     * @return {number} the time waited before attempting to obtain new results
     */
    get asyncE2EWaitInterval() {
        return Configuration.instance().value("asyncE2EWaitInterval", this.configuration, 5000);
    }

    /**
     * Indicates if the async mode flag is set for e2e tests running in batch mode (only available with batchEnabled set to true)
     * @return {boolean} the async mode flag
     */
    get asyncMode() {
        return this.batchEnabled && Configuration.instance().value("asyncMode", this.configuration, false);
    }

    /**
     * Get the complete configuration set up for the test suite
     * @return {object} the configuration set up for the test suite
     */
    get configuration() {
        return this._configuration;
    }

    /**
     * Get the device id to set on requests for Alexa unit tests
     * @return {string} the device id
     */
    get deviceId() {
        return Configuration.instance().value("deviceId", this.configuration);
    }

    /**
     * Indicates if it's using the dynamo mock for Alexa unit tests
     * @return {string} returns mock if dynamo mock is set up
     */
    get dynamo() {
        return Configuration.instance().value("dynamo", this.configuration);
    }

    /**
     * Indicates if errors unrelated to the assertions (network for example) are ignored during e2e tests
     * @return {boolean} returns ignoreExternalErrors flag value
     */
    get ignoreExternalErrors() {
        return Configuration.instance().value("ignoreExternalErrors", this.configuration, false);
    }

    /****
     * The file where this test suite was defined.
     * @return {string} the test suite path
     */
    get fileName() {
        return this._fileName;
    }

    /**
     * set the file where this test suite was defined, useful when running Test Suite without an actual file
     * @param {string} name - the test suite path
     */
    set fileName(name) {
        this._fileName = name;
    }

    /**
     * The handler for the function to use for unit tests, returns "./index.handler" by default
     * @return {string} the path of the handler
     */
    get handler() {
        const handlerPath = Configuration.instance().value("handler", this.configuration);
        if (handlerPath) {
            return this.resolvePath(handlerPath);
        }
        return "./index.handler";

    }

    /**
     * The interaction model for Alexa unit tests, returns "./models/<locale>.json" by default
     * @return {string} the path to the interaction model
     */
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

    /**
     * Returns the correct absolute or relative path (paths should be relative to the testing.json)
     * @param {string} pathToResolve - the path to resolve
     * @param {string} absolute - if true, this will return the absolute path instead of the relative one
     * @return {string} the complete path
     */
    resolvePath(pathToResolve, absolute) {
        const configurationPath = Configuration.instance().value("configurationPath", this.configuration) || "";
        const configDirectory = path.dirname(configurationPath);

        if (absolute) {
            if (path.isAbsolute(configDirectory)) {
                return path.join(configDirectory, pathToResolve);
            }
            return path.join(process.cwd(), configDirectory, pathToResolve);
        }

        const relativePath = path.relative(process.cwd(), configDirectory);


        return path.join(relativePath, pathToResolve);
    }

    /**
     * Returns the invocation name to replace in e2e tests
      * @return {string} the invocation name
     */
    get invocationName() {
        return Configuration.instance().value("invocationName", this.configuration);
    }

    /**
     * Returns the invoker object that will process the utterances in this test suite
     * @return {object} the invoker object
     */
    get invoker() {
        return Configuration.instance().value("invoker", this.configuration);
    }

    /**
     * Returns the locale for this test suite
     * @return {string} the locale
     */
    get locale() {
        if (this._currentLocale) return this._currentLocale;
        return Configuration.instance().value("locale", this.configuration);
    }

    /**
     * Returns the platform (alexa or google) for this test suite, defaults to alexa
     * @return {string} the platform for this test suite
     */
    get platform() {
        return Configuration.instance().value("platform", this.configuration, "alexa");
    }

    /**
     * Returns the type of test (unit, e2e, simulation) for this test suite, defaults to unit
     * @return {string} the type of test
     */
    get type() {
        return Configuration.instance().value("type", this.configuration, "unit");
    }

    /**
     * Returns the list of locales that this test suite includes
     * @return {string[]} the list of locales
     */
    get locales() {
        return Configuration.instance().value("locales", this.configuration);
    }

    /**
     * Returns just the base name of the test suite file
     * @return {string} the base name of the test suite file
     */
    get shortFileName() {
        return path.basename(this._fileName);
    }

    /**
     * By default we look for files in the root folder, if testDirectory is set, this path will be used instead
     * @return {testDirectory} the path where we look for the tests
     */
    get testDirectory() {
        /// right now useful for testing
        return Configuration.instance().value("testDirectory", this.configuration);
    }

    /**
     * Returns the directory where this filename is located
     * @return {string} the directory where this filename is located
     */
    get directory() {
        return path.dirname(this._fileName);
    }

    /**
     * Returns the list of tests inside this test suite
     * @return {Test[]} the list of tests
     */
    get tests() {
        return this._tests;
    }

    /****
     * Set the list of tests inside this test suite, useful when using the test suite directly
     * @param {Test[]} tests - the list of tests
     */
    set tests(tests) {
        this._tests = tests;
    }

    /**
     * Array of objects {key, value} where the keys are the file name without
     * extension and the value is a key value object with the localization values
     * @return {object[]} list of localized values
     */
    get localizedValues() {
        return this._localizedValues;
    }

    /**
     * Set the localized values
     * @param {object[]} localizedValues - the list of localized values
     */
    set localizedValues(localizedValues) {
        this._localizedValues = localizedValues;
    }

    /**
     * The skill id used for Alexa unit tests in the requests
     * @return {string}  the skill id
     */
    get skillId() {
        return Configuration.instance().value("skillId", this.configuration);
    }

    /**
     * The stage used for simulation(development or live) in e2e tests
     * @return {string} The stage used for simulation
     */
    get stage() {
        return Configuration.instance().value("stage", this.configuration);
    }

    /**
     * Indicates if trace is active to print out the request and responses during the tests
     * @return {boolean} The value for the trace flag
     */
    get trace() {
        return Configuration.instance().value("trace", this.configuration);
    }

    /**
     * The user id used for Alexa unit tests in the requests
     * @return {string} the user id
     */
    get userId() {
        return Configuration.instance().value("userId", this.configuration);
    }

    /**
     * The supported interfaces used for Alexa unit tests in the requests
     * @return {object} the supported interfaces
     */
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

    /**
     * The virtual device token used for this test suite e2e tests depending on the platform and locale
     * @return {string} The virtual device token
     */
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

    /**
     * Indicates if the e2e tests run all utterances in batch or sequentially
     * @return {boolean} returns true for utterances in batch, false for sequential
     */
    get batchEnabled() {
        return Configuration.instance().value("batchEnabled", this.configuration, true);
    }

    /**
     * Indicates which properties in the test and request will be ignored when evaluating the assertions,
     * useful when running the same set of test for different platforms
     * @return {string[]} returns array of Json paths with the ignored properties
     */
    get ignoreProperties() {
        return Configuration.instance().value("ignoreProperties", this.configuration, {});
    }

    /**
     * Speech to text service to use, it could be google or witai, defaults to google
     * @return {string} stt
     */
    get stt() {
        return Configuration.instance().value("stt", this.configuration, "google");
    }

    /**
     * Only for google, location of the request
     * @return {object} lat and lng properties of the location
     */
    get deviceLocation() {
        return Configuration.instance().value("deviceLocation", this.configuration);
    }

    /**
     * Indicates what is the maximum time e2e test can wait for a single utterance response to come back
     * @return {number} max wait time for a single utterance
     */
    get maxAsyncE2EResponseWaitTime() {
        return Configuration.instance().value("maxAsyncE2EResponseWaitTime", this.configuration, 15000);
    }

    /**
     * Only for google, OFF for a request on a device without screen, defaults PLAYING
     * @return {string} stt
     */
    get screenMode() {
        return Configuration.instance().value("screenMode", this.configuration, "PLAYING");
    }

    /**
     * Origin of the request, accepted values are "http", "cli", "sdk", "monitoring" and "dashboard", defaults http
     * @return {string} stt
     */
    get client() {
        return Configuration.instance().value("client", this.configuration, "http");
    }

    /**
     * Returns the value for a key for the locale used on this test suite
     * @param {string} key - key to find in the localized values list
     * @return {string} value for the specific key on this locale
     */
    getLocalizedValue(key) {
        if (!this._localizedValues || !this.locale) return undefined;
        let localizedValue = this._localizedValues[this.locale] && this._localizedValues[this.locale][key];
        if (localizedValue) return localizedValue;

        const language = this.locale.split("-")[0];
        localizedValue = this._localizedValues[language] && this._localizedValues[language][key];
        if (localizedValue) return localizedValue;

        return undefined;
    }

    /**
     * Returns the filter as an object
     * @return {object} the filter object
     */
    filterObject() {
        let filterModule = this.filter;
        if (typeof this.filter === "string") {
            let filterObject;
            if (filterModule) {
                const absoluteFilterModule = this.resolvePath(filterModule, true);
                try {
                    filterObject = require(absoluteFilterModule);
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

    /**
     * Get a list of tags from a comma delimited string
     * @return {string[]} the list of tags
     */
    getTagsFromString(tagsAsString) {
        if (!Util.isString(tagsAsString)) {
            return [];
        }
        return  tagsAsString.split(",").map(tag => tag.trim());
    }

    /**
     * Process the include and exclude flags and turn them to skip's and only's
     */
    processIncludedAndExcludedTags() {
        const includeRaw =  this.include;
        const excludeRaw =  this.exclude;

        const include = typeof includeRaw === "object" ? includeRaw : this.getTagsFromString(includeRaw);
        const exclude = typeof excludeRaw === "object" ? excludeRaw : this.getTagsFromString(excludeRaw);

        this.tests = this.tests.map((test) => {
            if (!test.tags || test.tags.length === 0) {
                if (include.length > 0) {
                    test.skip = true;
                }

                if (exclude.length > 0) {
                    test.only = true;
                }
                return test;
            }

            const isTheTestIncluded = test.tags.some(tag => include.includes(tag));
            const isTheTestExcluded = test.tags.some(tag => exclude.includes(tag));

            if (isTheTestExcluded) {
                test.skip = true;
            }

            if (isTheTestIncluded) {
                test.only = true;
            }

            return test;
        });
    }

    /**
     * Process the skip and only flags for the tests inside the suite
     */
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

    /**
     * Set the locale for the current run of the test suite
     * @param {string} currentLocale - locale for the current run
     */
    set currentLocale(currentLocale) {
        this._currentLocale = currentLocale;
    }

    /**
     * Read the locales folder path and obtain the list of values to used to replace depending on
     * which locale is running
     */
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

    /****
     * Raw test elements obtained from parsing the yaml file to an object
     * @return {object} Raw test elements from the yaml parsing
     */
    get rawTestContent() {
        return this._rawTestContent;
    }

    /**
     * Raw test elements obtained from parsing the yaml file to an object
     * @param {object} rawTestContent - Raw test elements from the yaml parsing
     */
    set rawTestContent(rawTestContent) {
        this._rawTestContent = rawTestContent;
    }

}

module.exports = TestSuite;

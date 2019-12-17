const _ = require("lodash");
const CONSTANTS = require("../util/Constants");
const debug = require("../util/Debug");
const fs = require("fs");
const path = require("path");
const Util = require("../util/Util");

module.exports = class Configuration {

    static async configure(json, pathName, cliOverrides) {
        if (Configuration.singleton) {
            return;
        }
        Configuration.singleton = new Configuration();

        return await this.singleton.load(json, pathName, cliOverrides);
    }

    static setEnvIfUndefined(key, value) {
        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }

    static async reset() {
        Configuration.singleton = undefined;
    }

    static instance()  {
        return Configuration.singleton;
    }

    // Load configuration
    //  json: json configuration
    //  pathName: path were the test files are located
    async load(json, pathName, cliOverrides) {
        if (json) {
            this.configurationJSON = json;
        } else {
            let configurationPath = "";
            if (cliOverrides && cliOverrides["config"]) {
                configurationPath = cliOverrides["config"];
            } else {
                configurationPath = path.join(process.cwd(), "./testing.json");
            }
            const configurationPathExists = fs.existsSync(configurationPath);
            if (!configurationPathExists) {
                this.configurationJSON = {};
                // eslint-disable-next-line no-console
                console.error("Unable to find the configuration file " + configurationPath);
            } else {
                try {
                    const contents = fs.readFileSync(configurationPath, "utf8");
                    this.configurationJSON = JSON.parse(contents);
                    this.configurationJSON.configurationPath = configurationPath;
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error("Unable to load the configuration file " + configurationPath);
                }
            }
        }

        const jestConfig = this.jestDefaults();
        // Test coverage goes under ./test_output/coverage
        jestConfig.coverageDirectory = path.join(this.resultsDirectory(), "coverage");

        // Override jest values
        const jestOverrides = this.configurationJSON.jest;
        if (jestOverrides) {
            for (const key of Object.keys(jestOverrides)) {
                debug("JEST - Override " + key + ": " + jestOverrides[key]);
                jestConfig[key] = jestOverrides[key];
            }
        }

        this.configurationJSON.jest = jestConfig;

        this.overrideConfigurationWithEnvVariables();
        this.overrideConfigurationWithCli(cliOverrides);


        if (!this.configurationJSON.jest.reporters || !this.configurationJSON.jest.reporters.length) {
            this.configurationJSON.jest.reporters = ["default"];
        }

        if (this.configurationJSON.jest.reporters.includes("default")) {
            if (!("html" in this.configurationJSON) || this.configurationJSON.html === true) {
                this.configurationJSON.jest.reporters.push(this.htmlReporterConfiguration());
            }
        }

    }

    configurationDir() {
        return path.dirname(this.configurationJSON.configurationPath);
    }

    htmlReporterConfiguration () {
        let pathToModule = path.join(__dirname, "../../node_modules/bespoken-jest-stare");
        // If we do not find jest-stare in this directory, means this module (skill-testing-ml) is a dependency
        // In that case, we keep going up to the node_modules that contains skill-testing-ml - jest-stare will be at that same level
        if (!fs.existsSync(pathToModule)) {
            pathToModule = path.join(__dirname, "../../../../bespoken-jest-stare");
        }

        if (!this.json().type || this.json().type === CONSTANTS.TYPE.unit) {
            Configuration.setEnvIfUndefined("JEST_STARE_COVERAGE_LINK", "../coverage/lcov-report/index.html");
        } else {
            delete process.env.JEST_STARE_COVERAGE_LINK;
        }

        Configuration.setEnvIfUndefined("JEST_STARE_REPORT_SUMMARY", true);
        Configuration.setEnvIfUndefined("JEST_STARE_REPORT_TITLE", "Bespoken Test Report");
        Configuration.setEnvIfUndefined("JEST_STARE_REPORT_HEADLINE", "Bespoken Test Report");

        Configuration.setEnvIfUndefined("JEST_STARE_RESULT_DIR", path.join(this.resultsDirectory(), "report"));
        Configuration.setEnvIfUndefined("JEST_STARE_LOG", "false");
        return pathToModule;
    }

    jestPath() {
        const defaultJestPath = path.join(__dirname, "../node_modules/.bin/jest");
        return this.json().jestPath ? this.json().jestPath : defaultJestPath;
    }

    jestConfig() {
        return this.json().jest;
    }

    json() {
        return this.configurationJSON;
    }

    jestDefaults() {
        // Get the skill testing jest delegate - relative to this file
        const testRunnerPath = path.join(__dirname, "../runner/JestAdapter.js");
        debug("JestTestRunner: " + testRunnerPath);

        // Configuration is a combination of Jest elements and Skill Testing ones
        return {
            collectCoverage: true,
            collectCoverageFrom: [
                "**/*.js",
                "!**/node_modules/**",
                "!**/vendor/**",
                "!**/test_output/**",
            ],
            coverageDirectory: "./coverage/",
            moduleFileExtensions: [
                "ts",
                "js",
                "json",
                "node",
                "yml",
            ],
            silent: false,
            testEnvironment: "node",
            testMatch: [
                "**/test/*.yml",
                "**/tests/*.yml",
                "**/*.e2e.yml",
                "**/*.spec.yml",
                "**/*.test.yml",
            ],
            testPathIgnorePatterns: [
                "/coverage/",
                "/locales/",
                "/lambda/",
                "/test_output/",
            ],
            testRunner: testRunnerPath,
            testURL: "http://localhost/",
            verbose: true,
        };
    }

    resultsDirectory() {
        const testResultsDir = path.join(process.cwd(), "test_output");
        if (!fs.existsSync(testResultsDir)) {
            fs.mkdirSync(testResultsDir);
        }
        return testResultsDir;
    }

    skillTestingConfig() {
        return this.json();
    }

    value(propertyName, overrides, defaultValue) {
        if (overrides && propertyName in overrides) {
            return Util.cleanValue(overrides[propertyName].valueOf());
        }

        if (propertyName in this.json()) {
            return Util.cleanValue(this.json()[propertyName]);
        }

        return defaultValue;
    }

    findReplaceMap() {
        return this.value("findReplace", undefined, {});
    }

    overrideConfigurationWithEnvVariables() {
        for (const key of Object.keys(process.env)) {
            const value = _.get(this.configurationJSON, key);

            if (value) {
                _.set(this.configurationJSON, key, Util.cleanValue(process.env[key]));
            }
        }
    }

    overrideConfigurationWithCli(cliOverrides) {
        if (!cliOverrides) return;
        for (const key of Object.keys(cliOverrides)) {
            let newValue = cliOverrides[key];
            if (newValue !== undefined) {
                _.set(this.configurationJSON, key, Util.cleanValue(newValue));
            }
        }
    }
};
const _ = require("lodash");
const cosmiconfig = require("cosmiconfig");
const debug = require("../util/Debug");
const path = require("path");
const Util = require("../util/Util");

module.exports = class Configuration {
    static async configure(json, path) {
        if (Configuration.singleton) {
            return;
        }
        Configuration.singleton = new Configuration();
        return this.singleton.load(json, path);
    }

    static instance()  {
        return Configuration.singleton;
    }

    async load(json, path) {
        if (json) {
            this.configurationJSON = json;
        } else {
            const searchPlaces = [
                "./test/unit/testing.json",
                "./test/unit/skill-testing.json",
                "./test/e2e/testing.json",
                "./test/e2e/skill-testing.json",
                "./test/testing.json",
                "./test/skill-testing.json",
                "testing.json",
                "skill-testing.json"
            ];
            if (path) {
                searchPlaces.unshift(`${path}/testing.json`);
                searchPlaces.unshift(`${path}/skill-testing.json`);
            }
            // Load the configuration file for skill-testing, if there is one
            const configExplorer = cosmiconfig("skill-testing", { searchPlaces });
            const skillConfigResult = await configExplorer.search();
            this.configurationJSON = skillConfigResult ? skillConfigResult.config : {};
            this.configurationJSON.configurationPath = skillConfigResult && skillConfigResult.filepath;
        }

        // Override jest values
        const jestConfig = this.jestDefaults();
        const jestOverrides = this.configurationJSON.jest;
        if (jestOverrides) {
            for (const key of Object.keys(jestOverrides)) {
                debug("JEST - Override " + key + ": " + jestOverrides[key]);
                jestConfig[key] = jestOverrides[key];
            }
        }

        this.configurationJSON.jest = jestConfig;
        this.overrideConfigurationWithEnvVariables();
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
                "!**/coverage/**",
                "!**/node_modules/**",
                "!**/vendor/**"
            ],
            coverageDirectory: "./coverage/",
            moduleFileExtensions: [
                "ts",
                "js",
                "yml"
            ],
            silent: false,
            testMatch: [
                "**/test/*.yml",
                "**/tests/*.yml",
                "**/*.e2e.yml",
                "**/*.spec.yml",
                "**/*.test.yml"
            ],
            testPathIgnorePatterns: [
                "/coverage/",
                "/locales/",
                "/lambda/",
            ],
            testRunner: testRunnerPath,
            verbose: true
        }
    }

    skillTestingConfig() {
        return this.json();
    }

    value(propertyName, overrides, defaultValue) {
        if (overrides && propertyName in overrides) {
            return overrides[propertyName].valueOf();
        }

        if (propertyName in this.json()) {
            return this.json()[propertyName];
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
                let newValue = process.env[key];
                if (Util.isBoolean(newValue)) {
                    newValue = newValue === "true";
                } 
                _.set(this.configurationJSON, key, newValue);
            }
        }
    }
}

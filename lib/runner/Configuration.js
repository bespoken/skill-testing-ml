const _ = require("lodash");
const cosmiconfig = require("cosmiconfig");
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
            const searchPlaces = [
                "./test/unit/testing.json",
                "./test/unit/skill-testing.json",
                "./test/e2e/testing.json",
                "./test/e2e/skill-testing.json",
                "./test/testing.json",
                "./test/skill-testing.json",
                "testing.json",
                "skill-testing.json",
            ];
            if (pathName) {
                searchPlaces.unshift(`${pathName}/testing.json`);
                searchPlaces.unshift(`${pathName}/skill-testing.json`);
            }
            // Load the configuration file for skill-testing, if there is one
            const configExplorer = cosmiconfig("skill-testing", { searchPlaces });
            const skillConfigResult = await configExplorer.search();
            this.configurationJSON = skillConfigResult ? skillConfigResult.config : {};
            this.configurationJSON.configurationPath = skillConfigResult && skillConfigResult.filepath;
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
        let pathToModule = path.join(__dirname, "../../node_modules/jest-stare");
        // If we do not find jest-stare in this directory, means this module (skill-testing-ml) is a dependency
        // In that case, we keep going up to the node_modules that contains skill-testing-ml - jest-stare will be at that same level
        if (!fs.existsSync(pathToModule)) {
            pathToModule = path.join(__dirname, "../../../../jest-stare");
        }
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

    overrideConfigurationWithCli(cliOverrides) {
        if (!cliOverrides) return;
        for (const key of Object.keys(cliOverrides)) {
            let newValue = cliOverrides[key];
            if (newValue !== undefined) {
                if (Util.isBoolean(newValue)) {
                    newValue = newValue === "true";
                } 
                _.set(this.configurationJSON, key, newValue);
            }
        }
    }
};
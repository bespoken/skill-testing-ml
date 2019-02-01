const _ = require("lodash");
const cosmiconfig = require("cosmiconfig");
const debug = require("../util/Debug");
const fs = require("fs");
const path = require("path");
const Util = require("../util/Util");

const SkillTestingDirectoryName = ".skillTesting";

module.exports = class Configuration {

    static skillTestingConfigDirectory() {
        return `${getUserHome()}/${SkillTestingDirectoryName}`;
    }

    static skillTestingConfigPath() {
        return `${this.skillTestingConfigDirectory()}/config`;
    }

    static saveConfig(config = {}) {
        if (!fs.existsSync(this.skillTestingConfigDirectory())) {
            fs.mkdirSync(this.skillTestingConfigDirectory());
        }
        let configBuffer = new Buffer(JSON.stringify(config, null, 4) + "\n");
        fs.writeFileSync(this.skillTestingConfigPath(), configBuffer);
    }

    static readConfig() {
        if (!fs.existsSync(this.skillTestingConfigPath())) {
            return undefined;
        }
        let data = fs.readFileSync(this.skillTestingConfigPath());
        let config = JSON.parse(data.toString());
        return config;
    }
        
    static async configure(json, pathName, cliOverrides, writeConfig) {
        if (writeConfig) {
            this.saveConfig(cliOverrides);
        }
        if (Configuration.singleton) {
            return;
        }
        Configuration.singleton = new Configuration();
        
        if (!cliOverrides) {
            const savedConfig = this.readConfig();
            if (savedConfig) {
                cliOverrides = savedConfig;
            }
        }

        return await this.singleton.load(json, pathName, cliOverrides);
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
        // configurationPath has the location of testing.json if is found
        if (this.configurationJSON.configurationPath) {
            // coverageDirectory works with relative paths, so we use path.relative to get a relative path. Ex:
            // process.cwd(): /Users/bespoken/multi-locale-facts-sample-skill
            // path.dirname(this.configurationJSON.configurationPath): /Users/bespoken/multi-locale-facts-sample-skill/test/unit
            // relativePath: test/unit
            let relativePath = path.relative(process.cwd(), path.dirname(this.configurationJSON.configurationPath));
            relativePath = relativePath || ".";
            jestConfig.coverageDirectory = path.normalize(`${relativePath}/coverage/`);
        }

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

        const jestReporters = this.configurationJSON.reporters;
        if (jestReporters) {
            this.setUpReporters(this.configurationJSON.jest, jestReporters);
        } else {
            this.configurationJSON.jest.reporters = ["default", "jest-html-reporters"];
        }

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
                "!**/vendor/**",
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
            ],
            testRunner: testRunnerPath,
            testURL: "http://localhost/",
            verbose: true,
        };
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

    setUpReporters(jestConfig, reporters) {
        jestConfig.reporters = [];

        if (reporters.includes("console")) {
            jestConfig.reporters.push("default");
        }

        if (reporters.includes("html")) {
            jestConfig.reporters.push("jest-html-reporters");
        }
    }
};

// Internet code:
//  http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
function getUserHome() {
    return process.env[(process.platform === "win32") ? "USERPROFILE" : "HOME"];
}
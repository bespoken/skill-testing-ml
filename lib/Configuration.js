const cosmiconfig = require("cosmiconfig");
const path = require("path");

module.exports = class Configuration {
    static async configure() {
        Configuration.singleton = new Configuration();
        return this.singleton.load();
    }

    static instance()  {
        return Configuration.singleton;
    }

    async load() {
        // Load the configuration file for skill-testing, if there is one
        const configExplorer = cosmiconfig("skill-testing", { rc: "skill-testing", rcExtensions: true });
        const skillConfigResult = await configExplorer.load();
        this.configurationJSON = skillConfigResult.config;
        
        // Override jest values
        const jestConfig = this.jestDefaults();
        const jestOverrides = this.configurationJSON.jest;
        if (jestOverrides) {
            for (const key of Object.keys(jestOverrides)) {
                console.log("JEST - Override " + key + ": " + jestOverrides[key]);
                jestConfig[key] = jestOverrides[key];
            }
        }

        this.configurationJSON.jest = jestConfig;
    }

    jestPath() {
        return this.json().skillTesting.jestPath ? this.json().skillTesting.jestPath : "./node_modules/.bin/jest";
    }

    jestConfig() {
        return this.json().jest;
    }

    json() {
        return this.configurationJSON;
    }

    jestDefaults() {
        // Get the skill testing jest delegate - relative to this file
        const testRunnerPath = path.join(__dirname, "../lib/JestAdapter.js");
        console.debug("JestTestRunner: " + testRunnerPath);

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
            testRegex: "yml",
            testRunner: testRunnerPath,
            verbose: true
        }
    }

    skillTestingConfig() {
        return this.json().skillTesting;
    }
}

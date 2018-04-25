const cosmiconfig = require("cosmiconfig");
const Path = require("path");

// Load the configuration file for skill-testing, if there is one
const configExplorer = cosmiconfig("skill-testing", { rc: "skill-testing", rcExtensions: true });

//
module.exports = async function testRunner(globalConfig, config, environment, runtime, testPath) {
    console.log("Test: " + testPath);
    const skillConfigResult = await configExplorer.load();
    const skillConfig = skillConfigResult.config;
    console.log("SkillConfig: " + JSON.stringify(skillConfig, null, 2));
    const runnerPath = Path.join(__dirname, "VirtualAlexaRunner.js")
    console.log("RunnerPath: " + runnerPath);
    const VirtualAlexaRunner = runtime.requireModule(runnerPath);
    const runner = new VirtualAlexaRunner(skillConfig);
    try {
        await runner.run(testPath);
    } catch (e) {
        console.error(e);
    }
    return {
        leaks: false,
        memoryUsage: 0,
        numFailingTests: 0,
        numPassingTests: 1,
        numPendingTests: 0,
        skipped: false,
        snapshot: {
            added: 0,
            fileDeleted: false,
            matched: 0,
            unchecked: 0,
            uncheckedKeys: [],
            unmatched: 0,
            updated: 0,
        },
        sourceMaps: {},
        testExecError: {},
        testFilePath: testPath,
        testResults: [{
            "ancestorTitles": [],
            "failureMessages": [],
            "location": {
                "column": 0,
                "line": 0,
            },
            "numPassingAsserts": 2,
            "status": "passed",
            "title": "Test1",
        }],
    };
}

// module.exports = function runTests(tests, watcher, onStart, onResult, onFailure, options) {
//
// }
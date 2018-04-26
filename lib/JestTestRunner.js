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
    let results;
    try {
        results = await runner.run(testPath);
    } catch (e) {
        console.error(e);
    }

    let passing = 0;
    let failing = 0;

    // Create an array of Jest results - we transform our results into this
    const jestResults = [];
    for (const result of results) {
        if (result.passed) {
            passing++;
        } else {
            failing++;
        }

        for (const interactionResult of result.interactionResults) {
            const status = interactionResult.error ? "failed" : "passed";
            const interactionErrors = [];
            if (interactionResult.error) {
                interactionErrors.push(interactionResult.error);
            }

            const jestResult = {
                ancestorTitles: [result.test.description],
                failureMessages: interactionErrors,
                location: {
                    column: 0,
                    line: 0,
                },
                numPassingAsserts: 2,
                status: status,
                title: interactionResult.interaction.utterance
            }
            jestResults.push(jestResult);
        }

    }

    //return staticResult;
    return {
        leaks: false,
        memoryUsage: 0,
        numFailingTests: failing,
        numPassingTests: passing,
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
        testExecError: undefined,
        testFilePath: testPath,
        testResults: jestResults,
    };
}

const staticResult = {
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
    status: "passed",
    success: true,
    testExecError: undefined,
    testFilePath: "test-path.text",
    testResults: [{
            ancestorTitles: ["Test1"],
            failureMessages: [],
            location: {
                column: 0,
                line: 0,
            },
            numPassingAsserts: 1,
            status: "passed",
            title: "Test1 Utterance1"
        }
        ]

}
// module.exports = function runTests(tests, watcher, onStart, onResult, onFailure, options) {
//
// }
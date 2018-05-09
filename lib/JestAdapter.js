// We use to print out errors on the console
// Got it from here:
//  https://github.com/facebook/jest/blob/master/packages/jest-jasmine2/src/reporter.js#L103
const Configuration = require("./Configuration");
const JestMessageUtil = require("jest-message-util");
const Path = require("path");

// Entry point for Jest to invoke the VirtualAlexaRunner
// Converts between VirtualAlexa responses and Jest responses
module.exports = async function testRunner(globalConfig, config, environment, runtime, testPath) {
    console.log("Test: " + testPath);
    const runnerPath = Path.join(__dirname, "VirtualAlexaRunner.js")
    console.log("RunnerPath: " + runnerPath);
    const VirtualAlexaRunner = runtime.requireModule(runnerPath);

    // This needs to be called here, as well as in the CLI classes, because Jest spawns a new process
    await Configuration.configure();
    const runner = new VirtualAlexaRunner(Configuration.instance().skillTestingConfig());

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
                //console.log("Error: " + )
                interactionErrors.push(interactionResult.error);
            }

            const jestResult = {
                ancestorTitles: [result.test.description],
                failureMessages: interactionErrors,
                location: {
                    column: 0,
                    line: 0,
                },
                numPassingAsserts: 0,
                status: status,
                title: interactionResult.interaction.utterance
            }
            jestResults.push(jestResult);
        }
    }

    //return staticResult;
    return {
        displayName: "Display name",
        failureMessage: JestMessageUtil.formatResultsErrors(
            jestResults,
            config,
            globalConfig,
            testPath,
        ),
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
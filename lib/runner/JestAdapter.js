// We use to print out errors on the console
// Got it from here:
//  https://github.com/facebook/jest/blob/master/packages/jest-jasmine2/src/reporter.js#L103
const Configuration = require("./Configuration");
const debug = require("../util/Debug");
const JestMessageUtil = require("jest-message-util");
const Path = require("path");

// Entry point for Jest to invoke the VirtualAlexaRunner
// Converts between VirtualAlexa responses and Jest responses
module.exports = async function testRunner(globalConfig, config, environment, runtime, testPath) {
    debug("Test: " + testPath);
    const runnerPath = Path.join(__dirname, "TestRunner.js")
    debug("RunnerPath: " + runnerPath);
    // It is necessary we call in this way to get code coverage - we use the Jest module loader
    const TestRunner = runtime.requireModule(runnerPath);

    // This needs to be called here, as well as in the CLI classes, because Jest spawns a new process
    await Configuration.configure();
    const runner = new TestRunner(Configuration.instance().skillTestingConfig());

    let jestResults;
    let passing = 0;
    let failing = 0;
    let pending = 0;

    try {
        const results = await runner.run(testPath);
        jestResults = transformResults(results);

        // Summarize the results
        for (const result of results) {
            if (result.test.skip) {
                pending++;
            } else if (result.passed) {
                passing++;
            } else {
                failing++;
            }
        }

    } catch (e) {
        failing = 1;
        jestResults = [asJestResult(e.test, e.message, e.interaction)];
    }


    return {
        console: null,
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
        numPendingTests: pending,
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

function transformResults(results) {
    const jestResults = [];
    // Create an array of Jest results - we transform our results into this
    for (const result of results) {
        if (result.interactionResults.length > 0) {
            for (const interactionResult of result.interactionResults) {
                const interactionErrors = [];
                if (interactionResult.error) {
                    //console.log("Error: " + )
                    interactionErrors.push(interactionResult.errorMessage);
                }

                const jestResult = asJestResult(result.test,
                    interactionResult.error,
                    interactionResult.interaction);
                jestResults.push(jestResult);
            }
        } else {
            const jestResult = asJestResult(result.test);
            jestResults.push(jestResult);
        }
    }
    return jestResults;
}

function asJestResult(test, errorMessage, interaction) {
    const errors = [];
    let status = "passed";

    if (errorMessage) {
        errors.push(errorMessage);
        status = "failed";
    }

    let ancestors = test ? [test.description] : [];
    let title = interaction ? interaction.utterance : "Global";
    if (test && test.skip) {
        status = "pending";
        ancestors = [];
        title = test.description;
    }

    return {
        ancestorTitles: ancestors,
        failureMessages: errors,
        location: {
            column: 0,
            line: 0,
        },
        numPassingAsserts: 0,
        status: status,
        title: title
    };
}
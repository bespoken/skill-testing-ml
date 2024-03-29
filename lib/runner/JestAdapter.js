// We use to print out errors on the console
// Got it from here:
//  https://github.com/facebook/jest/blob/master/packages/jest-jasmine2/src/reporter.js#L103
const _ = require("lodash");
const Configuration = require("./Configuration");
const debug = require("../util/Debug");
const JestMessageUtil = require("jest-message-util");
const Path = require("path");
const Util = require("../util/Util");

// Entry point for Jest to invoke the VirtualAlexaRunner
// Converts between VirtualAlexa responses and Jest responses
module.exports = async function testRunner(globalConfig, config, environment, runtime, testPath) {
    const runnerPath = Path.join(__dirname, "TestRunner.js");
    debug("RunnerPath: " + runnerPath);
    // It is necessary we call in this way to get code coverage - we use the Jest module loader
    const TestRunner = runtime.requireModule(runnerPath);

    // This needs to be called here, as well as in the CLI classes, because Jest spawns a new process
    await Configuration.configure(undefined, undefined, _.get(config, "globals.overrides"));
    const runner = new TestRunner(Configuration.instance().skillTestingConfig());

    const bespokenExtensions = { bespokenResults: null };
    let jestResults;
    let passing = 0;
    let failing = 0;
    let pending = 0;
    let doResultsHaveErrorMessages = false;

    try {
        const results = await runner.run(testPath);

        // Breaking circular reference in JSON object
        bespokenExtensions.bespokenResults = JSON.parse(JSON.stringify(_.cloneDeep(results), function (key, value) {
            if (key === "_testSuite") {
                value._tests = undefined;
                return value;
            }
            if (key === "_interactions" && Array.isArray(value)) {
                return value.map((e) => { delete e._test; return e; });
            }
            if (key === "_interaction" && Array.isArray(value)) {
                return value.map((e) => { delete e._test; return e; });
            }
            if (key === "_assertions" && Array.isArray(value)) {
                return value.map((e) => { delete e._interaction; return e; });
            }
            return value;
        }));

        jestResults = transformResults(results);

        // Summarize the results
        for (const result of results) {
            if (result.skipped) {
                pending++;
            } else if (result.passed) {
                passing++;
            } else {
                failing++;
            }
        }
        doResultsHaveErrorMessages = jestResults.some(
            jestResult => jestResult.failureMessages && jestResult.failureMessages.length
        );
    } catch (e) {
        failing = 1;
        jestResults = [asJestResult(e.test, e.message, e.interaction)];
    }

    const allTestsSkipped = (failing + passing === 0);

    const failureMessage = JestMessageUtil.formatResultsErrors(
        jestResults,
        config,
        globalConfig,
        testPath,
    );

    return {
        bespokenResults: bespokenExtensions.bespokenResults,
        console: null,
        displayName: "Display name",
        failureMessage,
        leaks: false,
        memoryUsage: 0,
        numFailingTests: failing,
        numPassingTests: passing,
        numPendingTests: pending,
        numTodoTests: 0,
        skipped: !doResultsHaveErrorMessages && allTestsSkipped,
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
};

function transformResults(results) {
    const jestResults = [];
    // Create an array of Jest results - we transform our results into this
    for (const result of results) {
        if (result.interactionResults.length > 0) {
            for (const interactionResult of result.interactionResults) {
                const jestResult = asJestResult(result.test,
                    interactionResult.error,
                    interactionResult.interaction,
                    result.locale, result.skipped,
                    interactionResult.timestamp,
                    interactionResult.errors,
                    interactionResult.interactionDto && interactionResult.interactionDto.utteranceURL
                );
                jestResults.push(jestResult);
            }
        } else {
            const jestResult = asJestResult(result.test, undefined, undefined, result.locale, result.skipped);
            jestResults.push(jestResult);
        }
    }
    return jestResults;
}

function addTimestampToError(errorMessage, timestamp) {
    let error = errorMessage;
    if (timestamp) {
        error = error + "\nTimestamp:\n\t";
        // eslint-disable-next-line spellcheck/spell-checker
        error = error + Util.formatDate(timestamp);
    }
    return error;
}

function getError(error) {
    let objectError = undefined;
    try {
        objectError = JSON.parse(error);
    } catch (_e) {
        objectError = error;
    }

    if (typeof (objectError) === "string") {
        return objectError;
    } else if (typeof (objectError) === "object") {
        if (objectError.error) {
            if (typeof (objectError.error) === "string") {
                return objectError.error;
            } else if (Array.isArray(objectError.error)) {
                return objectError.error.join(", ");
            }
        } else if (objectError.message) {
            return objectError.message;
        }
        return "Error description missing.";
    }
}

function asJestResult(test, error, interaction, locale, skipped, timestamp, multipleErrors, utteranceURL) {
    const errors = [];
    let status = "passed";
    let errorMessage = undefined;
    if (error) {
        errorMessage = getError(error);
    }

    if (errorMessage && !multipleErrors) {
        errors.push(addTimestampToError(errorMessage, timestamp));
        status = "failed";
    }

    if (multipleErrors) {
        const multipleErrorsWithTimestamp = multipleErrors.map((assertionError) => {
            return addTimestampToError(assertionError, timestamp);
        });
        errors.push(...multipleErrorsWithTimestamp);
        status = "failed";
    }

    const mainAncestor = (test && test.testSuite.description) ? `${test.testSuite.description} (${locale})` : locale;
    const ancestors = test ? [mainAncestor, test.description] : [];
    let title = interaction ? interaction.utterance : "Global";
    const duration = interaction ? interaction.duration : 0;

    if (skipped) {
        status = "pending";
    }

    if (skipped && !errorMessage) {
        title = "";
    }

    return {
        ancestorTitles: ancestors,
        duration: duration,
        failureMessages: errors,
        location: {
            column: 0,
            line: 0,
        },
        numPassingAsserts: 0,
        status: status,
        title: title,
        utteranceURL,
    };
}
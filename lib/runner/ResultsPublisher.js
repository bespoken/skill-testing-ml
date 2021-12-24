const _ = require("lodash");
const HTTP = require("../util/HTTP");
const LoggingErrorHelper = require("../util/LoggingErrorHelper");
const osPath = require("path");
const url = require("url");


const buildTestResult = (testResult) => {
    const start_timestamp = _.get(testResult, "_stopWatch.start", null);
    const end_timestamp = _.get(testResult, "_stopWatch.end", null);
    const test_name = _.get(testResult, "_test._description", "<no _test._description provided>").toString();

    const tags = _.castArray(_.get(testResult, "_test._tags", [])).map(s => s.toString());
    const raw_response_json = _.get(testResult, "_interactionResults", [{ error: "<no [${i}].interactionResults>" }]).map(e => e._rawResponse);
    const raw_config_json = _.omit(_.get(testResult, "_test._testSuite._configuration", { error: "<no _testSuite._configuration>" }), ["_yaml"]);

    const raw_json = JSON.stringify(testResult);
    const skipped = _.get(testResult, "_test._skip", false);

    const project_id = _.get(testResult, "_test._testSuite._projectId");
    const bespoken_project_id = _.get(testResult, "_test._testSuite._bespokenProjectId");
    const customer_id = _.get(testResult, "_test._testSuite._customerId");
    const test_run_id = _.get(testResult, "_test._testSuite._runId");

    const origin = _.get(testResult, "_test._testSuite._origin");
    const platform = _.get(testResult, "_test._testSuite._platform");

    const locale = _.get(testResult, "_test._testSuite._configuration.locale");
    const voice_id = _.get(testResult, "_test._testSuite._configuration.voiceId");
    const test_suite_name = _.get(testResult, "_test._testSuite._description", "").toString();
    const test_suite_filename = osPath.relative(process.cwd(), _.get(testResult, "_test._testSuite._fileName", ""));


    return {
        bespoken_project_id,
        customer_id,
        end_timestamp,
        locale,
        origin,
        platform,
        project_id,
        raw_config_json,
        raw_json,
        raw_response_json,
        skipped,
        start_timestamp,
        tags,
        test_name,
        test_run_id,
        test_suite_filename,
        test_suite_name,
        voice_id,
    };
};

const buildTestInteractionResult = testInteractionResult => (testInteraction, index) => {
    const _interactionResult = _.get(testInteractionResult, `[${index}]`, {});
    const interactionDto = _.get(_interactionResult, "interactionDto", {});

    const message = _.get(testInteraction, "_utterance", "<no utterance>");
    const transcript = _.get(_interactionResult, "_rawResponse.transcript", "<no rawResponse.transcript>");
    const display = _.get(_interactionResult, "_rawResponse.display", "<no display provided>");
    const assertion = _.get(interactionDto, "assertions", "<no utterance>");
    const result = _.get(interactionDto, "result.passed", null) ? "PASSED" : "FAILED";
    const raw_response = _.get(_interactionResult, "_rawResponse", null);

    return {
        assertion,
        display,
        message,
        raw_response,
        result,
        transcript,
    };
};

const transformIntoPayload = (data) => {
    const test_results = _.get(data, "results.testResults", [])
        // gather all bespoken results of every test suite execution
        .map(e => e.bespokenResults)
        // join all executed test from different test suites
        .reduce((p, c) => p.concat(c), [])
        // prepare test data
        .map((e) => {
            const testResultProperties = buildTestResult(e);
            const test_interaction_results = _.get(e, "_test._interactions", [])
                .map(buildTestInteractionResult(_.get(e, "_interactionResults", [])));
            const result = !test_interaction_results
                .filter(e => !e.skipped)
                .reduce((previous, current, index, all) => all, [{}])
                .some(e => e.result !== true) ? "PASSED" : "FAILED";

            return _.assign({
                result,
                test_interaction_results,
            }, testResultProperties);
        });

    const {
        bespoken_project_id,
        customer_id,
        origin,
        platform,
        project_id,
        test_run_id,
    } = _.get(test_results, "[0]", {});

    const { 0: start_timestamp, 1: end_timestamp } = test_results
        .map(e => [e.start_timestamp, e.end_timestamp])
        .reduce((p, c) => p.concat(c), [])
        .map(e => new Date(e))
        .sort()
        .filter((_, i, a) => i === 0 || i === a.length - 1);


    const raw_json = null;

    const test_suites_passed = _.get(data, "results.numPassedTestSuites", 0);
    const test_suites_failed = _.get(data, "results.numFailedTestSuites", 0);
    const test_suites_skipped = _.get(data, "results.numPendingTestSuites", 0);
    const tests_passed = _.get(data, "results.numPassedTests", 0);
    const tests_failed = _.get(data, "results.numFailedTests", 0);
    const tests_skipped = _.get(data, "results.numPendingTests", 0);
    const result = _.get(data, "results.success", false) ? "PASSED" : "FAILED";

    return {
        bespoken_project_id,
        customer_id,
        end_timestamp,
        origin,
        platform,
        project_id,
        raw_json,
        result,
        start_timestamp,
        test_results,
        test_run_id,
        test_suites_failed,
        test_suites_passed,
        test_suites_skipped,
        tests_failed,
        tests_passed,
        tests_skipped,
    };
};

const postDataIntoEndpoint = async (payload) => {
    const baseUrl = process.env.BESPOKEN_API_BASE_URL || "https://bespoken-api.bespoken.tools";
    const method = "POST";
    const headers = { "Content-Type": "application/json" };

    const endpoint = url.parse(baseUrl)
        .resolveObject("/reporting/testResults");

    const {
        host,
        port,
        protocol,
        path,
    } = endpoint;
    return HTTP.post({ headers, host, method, path, port, protocol }, payload);
};

class ResultsPublisher {
    async publishResults(data) {
        return Promise.resolve()
            .then(() => transformIntoPayload(data))
            .then(payload => postDataIntoEndpoint(payload))
            .catch(err => LoggingErrorHelper.error("bst-test", `Error saving test results Raw Error: ${JSON.stringify(err)}`));
    }
}

module.exports = {
    ResultsPublisher,
    buildTestInteractionResult,
    buildTestResult,
    postDataIntoEndpoint,
    transformIntoPayload,
};
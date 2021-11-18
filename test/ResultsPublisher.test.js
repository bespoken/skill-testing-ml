const _ = require("lodash");
const { transformIntoPayload } = require("../lib/runner/ResultsPublisher");

describe("ResultsPublisher", () => {
    test("Should create empty payload When passed empty object", async () => {

        const payload = transformIntoPayload({});

        expect(payload).toBeDefined();

        expect(payload).toHaveProperty("test_run_id");
        expect(payload).toHaveProperty("customer_id");
        expect(payload).toHaveProperty("project_id");
        expect(payload).toHaveProperty("origin");
        expect(payload).toHaveProperty("platform");
        expect(payload).toHaveProperty("start_timestamp");
        expect(payload).toHaveProperty("end_timestamp");
        expect(payload).toHaveProperty("raw_json");
        expect(payload).toHaveProperty("test_suites_passed");
        expect(payload).toHaveProperty("test_suites_failed");
        expect(payload).toHaveProperty("tests_passed");
        expect(payload).toHaveProperty("tests_failed");
        expect(payload).toHaveProperty("tests_skipped");
        expect(payload).toHaveProperty("result", "FAILED");

        //expect(stopWatch.toDto()).toHaveProperty("start");
        //expect(stopWatch.toDto()).toHaveProperty("end");
    });

    test("Should create empty payload When passed null object", async () => {

        const payload = transformIntoPayload(null);

        expect(payload).toBeDefined();

        expect(payload).toHaveProperty("test_run_id");
        expect(payload).toHaveProperty("customer_id");
        expect(payload).toHaveProperty("project_id");
        expect(payload).toHaveProperty("origin");
        expect(payload).toHaveProperty("platform");
        expect(payload).toHaveProperty("start_timestamp");
        expect(payload).toHaveProperty("end_timestamp");
        expect(payload).toHaveProperty("raw_json");
        expect(payload).toHaveProperty("test_suites_passed");
        expect(payload).toHaveProperty("test_suites_failed");
        expect(payload).toHaveProperty("tests_passed");
        expect(payload).toHaveProperty("tests_failed");
        expect(payload).toHaveProperty("tests_skipped");
        expect(payload).toHaveProperty("result", "FAILED");
    });

    test("Should create empty payload When one single test result passed test run", async () => {
        const jestResults = {};

        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._runId", "__run_id__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._projectId", "__project_id__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._customerId", "__customer_id__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._bespokenProjectId", "__bespoken_project_id__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._virtualDeviceToken", "__virtual_token__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._platform", "__platform__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._testSuite._origin", "__origin__");


        _.set(jestResults, "results.testResults[0].bespokenResults[0]._test._interactions[0]._utterance", "__message__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0].", {});
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0]._rawResponse.transcript", "__transcript__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0]._rawResponse.display", "__display__");
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0]._rawResponse", {});
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0].interactionDto.assertions", {});
        _.set(jestResults, "results.testResults[0].bespokenResults[0]._interactionResults[0].interactionDto.result.passed", true);


        const payload = transformIntoPayload(jestResults);

        expect(payload).toBeDefined();

        expect(Object.keys(payload).sort())
            .toStrictEqual([
                "bespoken_project_id",
                "customer_id",
                "end_timestamp",
                "origin",
                "platform",
                "project_id",
                "raw_json",
                "result",
                "start_timestamp",
                "test_results",
                "test_run_id",
                "test_suites_failed",
                "test_suites_passed",
                "test_suites_skipped",
                "tests_failed",
                "tests_passed",
                "tests_skipped",
            ]);

        expect(payload).toHaveProperty("test_run_id", "__run_id__");
        expect(payload).toHaveProperty("customer_id", "__customer_id__");
        expect(payload).toHaveProperty("project_id", "__project_id__");
        expect(payload).toHaveProperty("bespoken_project_id", "__bespoken_project_id__");
        expect(payload).toHaveProperty("origin", "__origin__");
        expect(payload).toHaveProperty("platform", "__platform__");
        expect(payload).toHaveProperty("start_timestamp");
        expect(payload).toHaveProperty("end_timestamp");
        expect(payload).toHaveProperty("raw_json");
        expect(payload).toHaveProperty("test_suites_passed");
        expect(payload).toHaveProperty("test_suites_failed");
        expect(payload).toHaveProperty("tests_passed");
        expect(payload).toHaveProperty("tests_failed");
        expect(payload).toHaveProperty("tests_skipped");
        expect(payload).toHaveProperty("result", "FAILED");
        expect(payload).toHaveProperty("test_results");
        expect(payload.test_results).toHaveLength(1);


        expect(Object.keys(payload.test_results[0]).sort())
            .toStrictEqual([
                "bespoken_project_id",
                "customer_id",
                "end_timestamp",
                "locale",
                "origin",
                "platform",
                "project_id",
                "raw_config_json",
                "raw_json",
                "raw_response_json",
                "result",
                "skipped",
                "start_timestamp",
                "tags",
                "test_interaction_results",
                "test_name",
                "test_run_id",
                "test_suite_filename",
                "test_suite_name",
                "voice_id",
            ]);

        expect(payload.test_results[0]).toHaveProperty("bespoken_project_id");
        expect(payload.test_results[0]).toHaveProperty("customer_id");
        expect(payload.test_results[0]).toHaveProperty("end_timestamp");
        expect(payload.test_results[0]).toHaveProperty("locale");
        expect(payload.test_results[0]).toHaveProperty("origin");
        expect(payload.test_results[0]).toHaveProperty("platform");
        expect(payload.test_results[0]).toHaveProperty("project_id");
        expect(payload.test_results[0]).toHaveProperty("raw_config_json");
        expect(payload.test_results[0]).toHaveProperty("raw_json");
        expect(payload.test_results[0]).toHaveProperty("raw_response_json");
        expect(payload.test_results[0]).toHaveProperty("skipped");
        expect(payload.test_results[0]).toHaveProperty("start_timestamp");
        expect(payload.test_results[0]).toHaveProperty("tags");
        expect(payload.test_results[0]).toHaveProperty("test_name");
        expect(payload.test_results[0]).toHaveProperty("test_run_id");
        expect(payload.test_results[0]).toHaveProperty("test_suite_filename");
        expect(payload.test_results[0]).toHaveProperty("test_suite_name");
        expect(payload.test_results[0]).toHaveProperty("voice_id");
        expect(payload.test_results[0]).toHaveProperty("test_interaction_results");
        expect(payload.test_results[0].test_interaction_results).toHaveLength(1);

        expect(Object.keys(payload.test_results[0].test_interaction_results[0]).sort())
            .toStrictEqual([
                "assertion",
                "display",
                "message",
                "raw_response",
                "result",
                "transcript",
            ]);

        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("assertion");
        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("display");
        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("message");
        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("raw_response");
        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("result");
        expect(payload.test_results[0].test_interaction_results[0]).toHaveProperty("transcript");
    });

});
const Assertion = require("../lib/Assertion");
const InteractionResult = require("../lib/TestResult").InteractionResult;
const Test = require("../lib/Test");
const TestInteraction = require("../lib/TestInteraction");
const TestResult = require("../lib/TestResult").TestResult;
const testRunner = require("../lib/JestAdapter");
const TestSuite = require("../lib/TestSuite");

describe("JestAdapter", async () => {
    test("Runs a mock test that succeeds", async () => {
        const testSuite = new TestSuite("MyTest.yml");
        const test = new Test(testSuite, { description: "Test Description" });
        const testResult = new TestResult(test);
        const interaction = new TestInteraction("Hi");
        const interactionResult = new InteractionResult(interaction);
        testResult.addInteractionResult(interactionResult);

        const interaction2 = new TestInteraction("Hi");
        const interactionResult2 = new InteractionResult(interaction2)
        testResult.addInteractionResult(interactionResult2);

        const results = [testResult];

        const jestResults = await testRunner({}, {}, {}, new Runtime(results), "MyTest.yml");
        expect(jestResults.numPassingTests).toBe(1);
        expect(jestResults.numFailingTests).toBe(0);
        expect(jestResults.testResults.length).toBe(2);
        expect(jestResults.testFilePath).toBe("MyTest.yml");

        // Check the individual test result
        const jestTestResult = jestResults.testResults[0]
        expect(jestTestResult.ancestorTitles[0]).toBe("Test Description");
        expect(jestTestResult.status).toBe("passed");
    });

    test("Runs a mock test that fails", async () => {
        const testSuite = new TestSuite("MyTest.yml");
        const test = new Test(testSuite, { description: "Test Description" });
        const testResult = new TestResult(test);
        const interaction = new TestInteraction(test, "Hi");
        const assertion = new Assertion(interaction, "path", "==", "value");
        const interactionResult = new InteractionResult(interaction, assertion, "Here is an interactionError");
        testResult.addInteractionResult(interactionResult);
        const results = [testResult];

        const jestResults = await testRunner({}, { rootDir: "rootDir" }, {}, new Runtime(results), "MyTest.yml");
        expect(jestResults.numPassingTests).toBe(0);
        expect(jestResults.numFailingTests).toBe(1);
        expect(jestResults.testResults.length).toBe(1);

        // Check the magical failure message
        expect(jestResults.failureMessage).toContain("Test Description › Hi");
        expect(jestResults.failureMessage).toContain("Here is an interactionError");

        // Check the individual test result
        const jestTestResult = jestResults.testResults[0]
        expect(jestTestResult.ancestorTitles[0]).toBe("Test Description");
        expect(jestTestResult.status).toBe("failed");
    });

    test("Runs a mock test that fails on global parsing", async () => {
        const jestResults = await testRunner({}, { rootDir: "rootDir" }, {}, new Runtime([]), "GlobalError.yml");
        expect(jestResults.numPassingTests).toBe(0);
        expect(jestResults.numFailingTests).toBe(1);
        expect(jestResults.testResults.length).toBe(1);

        // Check the magical failure message
        expect(jestResults.failureMessage).toContain("Global");
        expect(jestResults.failureMessage).toContain("I got an error");
    });

    test("Runs a mock test that fails on test parsing", async () => {
        const jestResults = await testRunner({}, { rootDir: "rootDir" }, {}, new Runtime([]), "TestError.yml");
        expect(jestResults.numPassingTests).toBe(0);
        expect(jestResults.numFailingTests).toBe(1);
        expect(jestResults.testResults.length).toBe(1);

        // Check the magical failure message
        expect(jestResults.failureMessage).toContain("Test Error Description");
        expect(jestResults.failureMessage).toContain("Utterance");
        expect(jestResults.failureMessage).toContain("I got an error");
    });

    test("Runs a mock test that has skips", async () => {
        const testSuite = new TestSuite("MyTest.yml");
        const test = new Test(testSuite, { description: "Test 1" });
        const test2 = new Test(testSuite, { description: "Test 2" });
        test2.skip = true;

        const testResult = new TestResult(test);
        const interaction = new TestInteraction("Hi");
        const interactionResult = new InteractionResult(interaction)
        testResult.addInteractionResult(interactionResult);

        const testResult2 = new TestResult(test2);

        const results = [testResult, testResult2];

        const jestResults = await testRunner({}, {}, {}, new Runtime(results), "MyTest.yml");
        expect(jestResults.numPassingTests).toBe(1);
        expect(jestResults.numFailingTests).toBe(0);
        expect(jestResults.testResults.length).toBe(2);
        expect(jestResults.testResults[0].status).toBe("passed");
        expect(jestResults.testResults[1].status).toBe("pending");
    });
});

class Runtime {
    constructor(results) {
        FakeVirtualAlexaRunner.results = results;
    }

    requireModule () {
        return FakeVirtualAlexaRunner;
    }
}

class FakeVirtualAlexaRunner {
    run(testFile) {
        // Test setup to a global error
        if (testFile === "GlobalError.yml") {
            throw new Error("I got an error");
        } else if (testFile === "TestError.yml") {
            const error = new Error("I got an error");
            const suite = new TestSuite(testFile);
            error.test = new Test(suite, "Test Error Description");
            error.interaction = new TestInteraction(test, "Utterance");
            throw error;
        }
        return FakeVirtualAlexaRunner.results;
    }
}
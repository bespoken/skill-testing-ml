const TestParser = require("../lib/TestParser");

describe("test parser", () => {
    test("parses simple test file successfully", () => {
        const parser = new TestParser("test/simple-tests.yml");
        const testSuite = parser.parse();
        expect(testSuite.configuration.locale).toEqual("en-US");
        expect(testSuite.tests.length).toEqual(2);

        const firstTest = testSuite.tests[0];
        expect(firstTest.description).toEqual("Launches successfully");
        expect(firstTest.interactions.length).toEqual(1);

        expect(firstTest.interactions[0].requestType).toEqual("LaunchRequest");

        const secondTest = testSuite.tests[1];
        expect(secondTest.description).toEqual("Gets a new fact intent");
        expect(secondTest.interactions.length).toEqual(1);

        expect(secondTest.interactions[0].requestType).toBeUndefined();
        expect(secondTest.interactions[0].utterance).toEqual("Get New Facts");
        expect(secondTest.interactions[0].assertions.length).toEqual(3);

        const firstAssertion = secondTest.interactions[0].assertions[0];
        expect(firstAssertion.path).toEqual("response.outputSpeech.ssml");
        expect(firstAssertion.operator).toEqual("==");
        expect(firstAssertion.value).toEqual("\"Here's your fact:*\"");
        expect(firstAssertion.valueAsString()).toEqual("Here's your fact:*");

        const secondAssertion = secondTest.interactions[0].assertions[1];
        expect(secondAssertion.path).toEqual("response.card.title");
        expect(secondAssertion.operator).toEqual("==");
        expect(secondAssertion.valueAsString()).toEqual("Space Facts");
    });
});

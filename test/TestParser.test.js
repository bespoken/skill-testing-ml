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
        expect(firstAssertion.value).toEqual("Here's your fact:*");

        const secondAssertion = secondTest.interactions[0].assertions[1];
        expect(secondAssertion.path).toEqual("response.card.title");
        expect(secondAssertion.operator).toEqual("==");
        expect(secondAssertion.value).toEqual("Space Facts");
    });

    test("parses simple test file with bad assertion", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: # LaunchRequest is "reserved" - it is not an utterance but a request type
  - response === "Here's your fact:*"    
        `)
        expect(() => {
            parser.parse();
        }).toThrowError("Invalid operator: ===");
    });

    test("parses simple test file with object assertions", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: # LaunchRequest is "reserved" - it is not an utterance but a request type
  - response.outputSpeech.ssml: "Here's your fact: *"  
  - response.outputSpeech.ssml: /regular expression+.*/  
  - response.outputSpeech.ssml: "/Here's your fact: .*/" 
  - response: undefined 
        `)
        const testSuite = parser.parse();
        const assertion = testSuite.tests[0].interactions[0].assertions[0];
        expect(assertion.path).toEqual("response.outputSpeech.ssml");
        expect(assertion.operator).toEqual("==");
        expect(assertion.value).toEqual("Here's your fact: *");

        const assertion2 = testSuite.tests[0].interactions[0].assertions[1];
        expect(assertion2.path).toEqual("response.outputSpeech.ssml");
        expect(assertion2.operator).toEqual("=~");
        expect(assertion2.value).toEqual("/regular expression+.*/");

        const assertion3 = testSuite.tests[0].interactions[0].assertions[2];
        expect(assertion3.path).toEqual("response.outputSpeech.ssml");
        expect(assertion3.operator).toEqual("=~");
        expect(assertion3.value).toEqual("/Here's your fact: .*/");

        const assertion4 = testSuite.tests[0].interactions[0].assertions[3];
        expect(assertion4.path).toEqual("response");
        expect(assertion4.operator).toEqual("==");
        expect(assertion4.value).toBeUndefined();
    });

    test("parses simple test file with some funny conditions", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
- LaunchRequest: "*"
        `)
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(0);
        expect(testSuite.tests[0].interactions[0].expressions.length).toBe(0);
        expect(testSuite.tests[0].interactions[1].assertions.length).toBe(0);
        expect(testSuite.tests[0].interactions[1].expressions.length).toBe(0);
    });
});

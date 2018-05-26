const TestParser = require("../lib/TestParser");
const Util = require("../lib/Util");

describe("test parser", () => {
    test("parses simple test file successfully", () => {
        const parser = new TestParser("test/TestFiles/simple-tests.yml");
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

    test("parses simple test file with bad assertion", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: # LaunchRequest is "reserved" - it is not an utterance but a request type
  - response === "Here's your fact:*"    
        `)
        try {
            parser.parse();
        } catch (e) {
            expect(e.message).toBe("Invalid operator: ===");
            done();
        }
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
        expect(testSuite.tests[0].interactions[1].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[1].expressions.length).toBe(0);
    });

    test("parses file with expressions", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - request.test.value: A value
  - request.test.value2: Another value
        `)
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].expressions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].expressions[0].path).toBe("request.test.value");
        expect(testSuite.tests[0].interactions[0].expressions[0].value).toBe("A value");
        expect(testSuite.tests[0].interactions[0].expressions[1].value).toBe("Another value");
    });

    test("parses file with bad config", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
configuration:
    locale:en-US
--- 
- LaunchRequest:
  - request.test.value: A value
        `);
        try {
            parser.parse();
        } catch (e) {
            expect(e.name).toEqual("YAML Syntax Error");
            expect(e.message).toContain("Configuration element is not an object:");
            done();
        }
    });

    test("parses file with goto", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value: A value goto Help
  - exit
- Help:
  - response.test.value: A value
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("A value");
        expect(testSuite.tests[0].interactions[0].assertions[0].goto).toBe("Help");
        expect(testSuite.tests[0].interactions[0].assertions[1].exit).toBe(true);
    });

    test("parses file with multi-word goto", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value: A value goto Help Me
- Help Me:
  - response.test.value: A value
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].goto).toBe("Help Me");
    });

    test("parses file with array of expected values", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value:
    - value 1
    - value 2
- Help Me:
  - response.test.value: 
    - /regex1/
    - /regex2/
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions[0].value.length).toBe(2);
        expect(testSuite.tests[0].interactions[1].assertions[0].value.length).toBe(2);
    });

    test("parses file with array that is incorrectly formatted", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value:
  - value1
  - value 2
        `);
        try {
            parser.parse();
        } catch (e) {
            expect(e.name).toEqual("YAML Syntax Error");
            expect(e.message).toContain("Invalid assertion: value1");
            done();
        }
    });

    test("parses file with invalid numeric value", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value > test
        `);
        try {
            parser.parse();
        } catch (e) {
            expect(e.name).toEqual("YAML Syntax Error");
            expect(e.message).toContain("Invalid expected value - must be numeric: test");
            done();
        }
    });

    test("parses file with one-line request-response", async () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: "Hi"
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("Hi");
        expect(testSuite.tests[0].interactions[0].assertions[0].operator).toBe("==");
    });

    test("parses file with one-line request-response and regex", async () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: /.*/
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("/.*/");
        expect(testSuite.tests[0].interactions[0].assertions[0].operator).toBe("=~");
    });

    test("parses file with one-line request-response and number", async () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: 15
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe(15);
        expect(testSuite.tests[0].interactions[0].assertions[0].operator).toBe("==");
    });

    test("parses file with line numbers", async () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: "string"
- LaunchRequest: "string2"
# Comment
- LaunchRequest: "string3"
        `);
        const testSuite = parser.parse();
        const value = testSuite.tests[0].interactions[0].assertions[0]._value;
        expect(Util.isString(value));
        expect(testSuite.tests[0].interactions[0].assertions[0]._value._yaml.line).toBe(2);
        expect(testSuite.tests[0].interactions[1].assertions[0]._value._yaml.line).toBe(3);
        expect(testSuite.tests[0].interactions[2].assertions[0]._value._yaml.line).toBe(5);
    });
});

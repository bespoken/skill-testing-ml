const Configuration = require("../lib/runner/Configuration");
const TestParser = require("../lib/test/TestParser");
const Util = require("../lib/util/Util");

describe("test parser", () => {
    test("parses simple test file successfully", () => {
        const parser = new TestParser("test/TestFiles/simple-tests.yml");
        const testSuite = parser.parse();
        expect(testSuite.configuration.locale).toEqual("en-US");
        expect(testSuite.tests.length).toEqual(3);

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

        const thirdTest = testSuite.tests[2];
        expect(thirdTest.description).toEqual("Launches successfully");
        expect(thirdTest.interactions.length).toEqual(2);
        expect(thirdTest.interactions[0].requestType).toBeUndefined();
        expect(thirdTest.interactions[0].utterance).toEqual("Hi");
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
            expect(e.message).toBe("Test Syntax Error:\n\tInvalid operator: ===");
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
  - response.outputSpeech.ssml: 15
  - response: undefined 
        `)
        const testSuite = parser.parse();
        const assertion = testSuite.tests[0].interactions[0].assertions[0];
        expect(assertion.path).toEqual("response.outputSpeech.ssml");
        expect(assertion.operator).toEqual("==");
        expect(assertion.value).toEqual("Here's your fact: *");
        expect(assertion._value._yaml.line).toEqual(3);

        const assertion2 = testSuite.tests[0].interactions[0].assertions[1];
        expect(assertion2.path).toEqual("response.outputSpeech.ssml");
        expect(assertion2.operator).toEqual("=~");
        expect(assertion2.value).toEqual("/regular expression+.*/");

        const assertion3 = testSuite.tests[0].interactions[0].assertions[2];
        expect(assertion3.path).toEqual("response.outputSpeech.ssml");
        expect(assertion3.operator).toEqual("=~");
        expect(assertion3.value).toEqual("/Here's your fact: .*/");
        expect(assertion3._value._yaml.line).toEqual(5);

        const assertion4 = testSuite.tests[0].interactions[0].assertions[3];
        expect(assertion4.path).toEqual("response.outputSpeech.ssml");
        expect(assertion4.operator).toEqual("==");
        expect(assertion4._value._yaml.line).toBe(6);
        expect(assertion4.value).toBe(15);

        const assertion5 = testSuite.tests[0].interactions[0].assertions[4];
        expect(assertion5.path).toEqual("response");
        expect(assertion5.operator).toEqual("==");
        expect(assertion5.value).toBeUndefined();
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
            expect(e.name).toEqual("Test Syntax Error");
            expect(e.message).toContain("Configuration element is not an object");
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
        parser.load(`--- 
- LaunchRequest:
  - response.test.value: A value goto Help Me
- Help Me:
  - response.test.value: A value
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].lineNumber).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].lineNumber).toBe(3);
        expect(testSuite.tests[0].interactions[0].assertions[0].goto).toBe("Help Me");
    });

    test("parses file with array of expected values", () => {
        const parser = new TestParser();
        parser.load(`--- 
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
        expect(testSuite.tests[0].interactions[0].assertions[0].lineNumber).toBe(3);
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
            expect(e.name).toEqual("Test Syntax Error");
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
            expect(e.message).toContain("Invalid expected value - must be numeric: test");
            expect(e.line).toBe(4);
            done();
        }
    });

    test("parses file with bad goto", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value: 5
  - response.test.value == test goto ten
        `);
        try {
            parser.parse();
        } catch (e) {
            expect(e.message).toContain("No match for goto: ten");
            expect(e.line).toBe(5);
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
        expect(testSuite.tests[0].interactions[0].lineNumber).toBe(3);
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

    test("parses file with intent slots=slotValue format", async () => {
        const parser = new TestParser();
        parser.load(`
--- 
- Intent Slot=ValueSlot: Hi
- Intent2 Slot2=ValueSlot2: 
    - prompt == "Sure, here's a history fact"
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);

        expect(testSuite.tests[0].interactions[0].utterance).toBe("Intent Slot=ValueSlot");

        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);

        expect(testSuite.tests[0].interactions[0].assertions[0].path).toBe("prompt");
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("Hi");
        expect(testSuite.tests[0].interactions[0].assertions[0].operator).toBe("==");

        expect(testSuite.tests[0].interactions[1].assertions.length).toBe(1);


        expect(testSuite.tests[0].interactions[1].utterance).toBe("Intent2 Slot2=ValueSlot2");
        expect(testSuite.tests[0].interactions[1].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[1].assertions[0].path).toBe("prompt");
        expect(testSuite.tests[0].interactions[1].assertions[0].value).toBe("Sure, here's a history fact");
        expect(testSuite.tests[0].interactions[1].assertions[0].operator).toBe("==");

    });

    test("parses file with only tests", () => {
        const parser = new TestParser("test/TestFiles/only-tests.yml");
        const testSuite = parser.parse();
        expect(testSuite.tests[0].skip).toBe(false);
        expect(testSuite.tests[0].only).toBe(false);

        expect(testSuite.tests[1].skip).toBe(false);
        expect(testSuite.tests[1].only).toBe(true);
        expect(testSuite.tests[1].description).toEqual("Test 2");

        expect(testSuite.tests[2].skip).toBe(false);
        expect(testSuite.tests[2].only).toBe(true);
        expect(testSuite.tests[2].description).toEqual("Test 3");

        expect(testSuite.tests[3].skip).toBe(false);
        expect(testSuite.tests[3].only).toBe(false);
    });

    test("parses file with skip test", () => {
        const parser = new TestParser("test/TestFiles/skip-tests.yml");
        const testSuite = parser.parse();
        expect(testSuite.tests[0].skip).toBe(false);
        expect(testSuite.tests[0].only).toBe(false);

        expect(testSuite.tests[1].skip).toBe(true);
        expect(testSuite.tests[1].only).toBe(false);
        expect(testSuite.tests[1].description).toEqual("Test 2");

        expect(testSuite.tests[2].skip).toBe(false);
        expect(testSuite.tests[2].only).toBe(false);
    });

    test("parses file with tag tests", () => {
        const parser = new TestParser("test/TestFiles/tag-tests.yml");
        const testSuite = parser.parse();
        expect(testSuite.tests[0].tags).toBe(undefined);

        expect(testSuite.tests[1].tags).toEqual(["alexa"]);
        expect(testSuite.tests[1].description).toEqual("Test 2");

        expect(testSuite.tests[2].tags).toEqual(["alexa", "broken"]);
        expect(testSuite.tests[2].description).toEqual("Test 3");

        expect(testSuite.tests[3].tags).toBe(undefined);
    });


    describe("findReplace", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("replace values", () => {
            Configuration.configure({
                findReplace: {
                    "INVOCATION_NAME": "my skill"
                 }
            });

            const parser = new TestParser();
            parser.load(`
--- 
- open INVOCATION_NAME:
  - request.test.value: A value
  - request.test.value2: Another value
        `)
            const testSuite = parser.parse();
            expect(testSuite.tests[0].interactions.length).toBe(1);
            expect(testSuite.tests[0].interactions[0].utterance).toBe("open my skill");
            expect(testSuite.tests[0].interactions[0].expressions.length).toBe(2);
            expect(testSuite.tests[0].interactions[0].expressions[0].path).toBe("request.test.value");
            expect(testSuite.tests[0].interactions[0].expressions[0].value).toBe("A value");
            expect(testSuite.tests[0].interactions[0].expressions[1].value).toBe("Another value");
        });
    });
});

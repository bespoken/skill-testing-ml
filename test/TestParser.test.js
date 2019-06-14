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
        `);
        try {
            parser.parse();
        } catch (e) {
            expect(e.message).toBe("Test Syntax Error:\n\tInvalid operator: ===");
            done();
        }
    });

    test("parses simple test file with bad tabulation", (done) => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest: # LaunchRequest is "reserved" - it is not an utterance but a request type
\t- response == "Here's your fact:*"    
        `);
        try {
            parser.parse();
            throw new Error("Tab error wasn't thrown");
        } catch (e) {
            expect(e.message).toContain("A YAML file cannot contain tabs as indentation at line 4, column 1");
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
  - prompt:
    - fact *
    - 
    - regex *
    `);
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

        const assertion6 = testSuite.tests[0].interactions[0].assertions[5];
        expect(assertion6.path).toEqual("prompt");
        expect(assertion6.operator).toEqual("==");
    });

    test("parses simple test file with some funny conditions", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
- LaunchRequest: "*"
- 100

        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(3);
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
        `);
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

    test("parses file with operators short syntax", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest != hello
- RandomIntent:
  - cardTitle !=
    - title1
    - title2
    - title3
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(2);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].path).toBe("prompt");
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("hello");
        expect(testSuite.tests[0].interactions[0].assertions[0].operator).toBe("!=");
        expect(testSuite.tests[0].interactions[1].assertions[0].path).toBe("cardTitle");
        expect(testSuite.tests[0].interactions[1].assertions[0].value)
            .toEqual(expect.arrayContaining(["title1", "title2", "title3"]));
        expect(testSuite.tests[0].interactions[1].assertions[0].operator).toBe("!=");

    });

    test("parses without error file with values to be replaced", () => {
        const parser = new TestParser();
        parser.load(`
--- 
- LaunchRequest:
  - response.test.value: A value and a {variable}
- one utterance: "{another_variable}"
- Help:
  - response.test.value !=
    - {variable_in_list}
    - value
    - {variable_in_list}
- nothing to replace: nothing at all
- String with no assertion
        `);
        const testSuite = parser.parse();
        expect(testSuite.tests[0].interactions.length).toBe(5);
        expect(testSuite.tests[0].interactions[0].assertions.length).toBe(1);
        expect(testSuite.tests[0].interactions[0].assertions[0].value).toBe("A value and a {variable}");
        expect(testSuite.tests[0].interactions[0].assertions[0].variables).toEqual(["variable"]);
        expect(testSuite.tests[0].interactions[1].assertions[0].value).toBe("{another_variable}");
        // We are currently skipping this "bad objects" on parsing
        // expect(testSuite.tests[0].interactions[1].assertions[0].variables).toEqual(["another_variable"]);
        expect(testSuite.tests[0].interactions[2].assertions[0].value).toEqual(expect.arrayContaining(["{variable_in_list}", "value", "{variable_in_list}"]));
        expect(testSuite.tests[0].interactions[2].assertions[0].variables).toEqual(["variable_in_list"]);
        expect(testSuite.tests[0].interactions[3].assertions[0].variables).toEqual([]);
        // Since we don't have assertions, we don't have variables
        expect(testSuite.tests[0].interactions[4].assertions).toEqual([]);
    });

    describe("findReplace", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("replace values", () => {
            Configuration.configure({
                findReplace: {
                    INVOCATION_NAME: "my skill",
                },
            });

            const parser = new TestParser();
            parser.load(`
--- 
- open INVOCATION_NAME:
  - request.test.value: A value
  - request.test.value2: Another value
        `);
            const testSuite = parser.parse();
            expect(testSuite.tests[0].interactions.length).toBe(1);
            expect(testSuite.tests[0].interactions[0].utterance).toBe("open my skill");
            expect(testSuite.tests[0].interactions[0].expressions.length).toBe(2);
            expect(testSuite.tests[0].interactions[0].expressions[0].path).toBe("request.test.value");
            expect(testSuite.tests[0].interactions[0].expressions[0].value).toBe("A value");
            expect(testSuite.tests[0].interactions[0].expressions[1].value).toBe("Another value");
        });
    });

    describe("getDefinedVariables", () => {
        const parser = new TestParser();
        const variablesArePresent = parser.getDefinedVariables("I'm looking for {firstVariable} and {secondVariable}");
        const noVariablesArePresent = parser.getDefinedVariables("these are not the drones you are looking for");
        const duplicatingVariables = parser.getDefinedVariables("{cloneVariable} not the clone {cloneVariable}");

        expect(variablesArePresent).toEqual(["firstVariable", "secondVariable"]);
        expect(noVariablesArePresent).toEqual([]);
        expect(duplicatingVariables).toEqual(["cloneVariable"]);

    });

    describe("parse with configuration overrides", () => {

        test("override configuration", () => {
            const parser = new TestParser();
            parser.load(`
---
configuration:
  locale: en-US
  voiceId: Hans
  virtualDeviceToken: token

--- 
- LaunchRequest: welcome
- Hello: word
            `);
            const testSuite = parser.parse({ virtualDeviceToken: "token_replace", voiceId: "Jon"});

            expect(testSuite.configuration.locale).toEqual("en-US");
            expect(testSuite.configuration.voiceId).toEqual("Jon");
            expect(testSuite.configuration.virtualDeviceToken).toEqual("token_replace");
            expect(testSuite.tests.length).toEqual(1);

            const firstTest = testSuite.tests[0];
            expect(firstTest.interactions.length).toEqual(2);
        });

        test("missing configuration on yml", () => {
            const parser = new TestParser();
            parser.load(`
--- 
- LaunchRequest: welcome
- Hello: word
            `);
            const testSuite = parser.parse({ locale: "US", virtualDeviceToken: "token_new", voiceId: "Ivy"});

            expect(testSuite.configuration.locale).toEqual("US");
            expect(testSuite.configuration.voiceId).toEqual("Ivy");
            expect(testSuite.configuration.virtualDeviceToken).toEqual("token_new");
            expect(testSuite.tests.length).toEqual(1);

            const firstTest = testSuite.tests[0];
            expect(firstTest.interactions.length).toEqual(2);
        });
    });

    describe("parse yaml object", () => {
        test("yml file to object", () => {
            const parser = new TestParser();
            parser.load(`
---
configuration:
    locale: en-US
    platform: alexa
    type: e2e
    virtualDeviceToken: myToken
---
- test: simple test
- hello: welcome
- open guess the price:
  - prompt:
    - how many
    - /.*/
  - prompt ==
    - guess
    - the
- one: please tell`);
            const testSuite = parser.parse();
            const yamlObject = testSuite.toYamlObject();
            expect(yamlObject).toBeDefined();
            expect(yamlObject.configuration).toBeDefined();
            expect(yamlObject.tests).toBeDefined();
            expect(yamlObject.tests.length).toBe(1);
            expect(yamlObject.tests[0].name).toStrictEqual("simple test");
            expect(yamlObject.tests[0].interactions.length).toBe(3);

            expect(yamlObject.tests[0].interactions[0].input).toBe("hello");
            expect(yamlObject.tests[0].interactions[0].expected.length).toBe(1);
            expect(yamlObject.tests[0].interactions[0].expected[0].action).toBe("prompt");
            expect(yamlObject.tests[0].interactions[0].expected[0].operator).toBe(":");
            expect(yamlObject.tests[0].interactions[0].expected[0].value).toBe("welcome");

            expect(yamlObject.tests[0].interactions[1].input).toBe("open guess the price");
            expect(yamlObject.tests[0].interactions[1].expected.length).toBe(2);
            expect(yamlObject.tests[0].interactions[1].expected[0].action).toBe("prompt");
            expect(yamlObject.tests[0].interactions[1].expected[0].operator).toBe(":");
            expect(yamlObject.tests[0].interactions[1].expected[0].value.length).toBe(2);
            expect(yamlObject.tests[0].interactions[1].expected[0].value[0]).toBe("how many");
            expect(yamlObject.tests[0].interactions[1].expected[1].action).toBe("prompt");
            expect(yamlObject.tests[0].interactions[1].expected[1].operator).toBe("==");
            expect(yamlObject.tests[0].interactions[1].expected[1].value.length).toBe(2);
            expect(yamlObject.tests[0].interactions[1].expected[1].value[0]).toBe("guess");
        });

        test("yaml object to yaml", () => {
            const parser = new TestParser();
            const yamlObject = {
                "configuration": {
                    "locale": "en-US",
                    "platform": "alexa",
                    "type": "e2e",
                    "virtualDeviceToken": "myToken",
                },
                "tests": [
                    {
                        "interactions": [
                            {
                                "expected": [
                                    {
                                        "action": "prompt",
                                        "operator": ":",
                                        "value": "welcome",
                                    },
                                ],
                                "input": "hello",
                            },
                            {
                                "expected": [
                                    {
                                        "action": "prompt",
                                        "operator": ":",
                                        "value": [
                                            "how many",
                                            "/.*/",
                                        ],
                                    },
                                    {
                                        "action": "prompt",
                                        "operator": "==",
                                        "value": [
                                            "guess",
                                            "the",
                                        ],
                                    },
                                ],
                                "input": "open guess the price",
                            },
                            {
                                "expected": [
                                    {
                                        "action": "prompt",
                                        "operator": ":",
                                        "value": "please tell",
                                    },
                                ],
                                "input": "one",
                            },
                        ],
                        "name": "simple test",
                    },
                ],
            };
            
            parser.loadYamlObject(yamlObject);
            expect(parser.contents).toBe(`---
configuration:
  locale: en-US
  platform: alexa
  type: e2e
  virtualDeviceToken: myToken
---
- test : simple test
- hello : welcome
- open guess the price :
  - prompt :
    - how many
    - /.*/
  - prompt ==
    - guess
    - the
- one : please tell
`);

        });
    });

});

const Configuration = require("../lib/runner/Configuration");
const CONSTANTS = require("../lib/util/Constants");
const LoggingErrorHelper = require("../lib/util/LoggingErrorHelper");
const mockGetConversationResults = require("virtual-device-sdk").mockGetConversationResults;
const mockMessage = require("virtual-device-sdk").mockMessage;
const mockVirtualDevice = require("virtual-device-sdk").mockVirtualDevice;

const TestParser = require("../lib/test/TestParser");
const TestRunner = require("../lib/runner/TestRunner");
const TestSuite = require("../lib/test/TestSuite");
const Util = require("../lib/util/Util.js");

describe("test runner", () => {
    beforeEach(() => {
        mockMessage.mockClear();
        mockGetConversationResults.mockClear();
        mockVirtualDevice.mockClear();
        Configuration.singleton = undefined;
    });

    test("subscribe()", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);
  
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        
        expect(messageCallbackMock).toHaveBeenCalledTimes(6);
        expect(resultCallbackMock).toHaveBeenCalledTimes(6);
        expect(resultCallbackMock.mock.calls[1][1]).toBeDefined();
        expect(resultCallbackMock.mock.calls[1][1].assertions.length).toBe(3);
        expect(resultCallbackMock.mock.calls[1][1].assertions[0].actual).toContain("Here's your fact");
        expect(resultCallbackMock.mock.calls[1][1].assertions[0].operator).toBe("=~");
        expect(resultCallbackMock.mock.calls[1][1].result).toBeDefined();
        expect(resultCallbackMock.mock.calls[1][1].result.rawResponse).toBeDefined();
    });

    test("Runs only tests with included tags", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            include: ["alexa"],
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        // Runs only 2 of the 3 tests (the ones including alexa)
        expect(messageCallbackMock).toHaveBeenCalledTimes(4);
        expect(resultCallbackMock).toHaveBeenCalledTimes(4);
    });

    test("Runs only tests not having excluded tags", async () => {
        const runner = new TestRunner({
            exclude: ["alexa"],
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        // Runs only 1 of the 3 tests (the one not including alexa)
        expect(messageCallbackMock).toHaveBeenCalledTimes(2);
        expect(resultCallbackMock).toHaveBeenCalledTimes(2);
    });

    test("Runs only tests with included tags but not excluded tags", async () => {
        const runner = new TestRunner({
            exclude: ["broken"],
            handler: "test/FactSkill/index.handler",
            include: ["alexa"],
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        // Runs only 1 of the 3 tests (the ones including alexa but not broken)
        expect(messageCallbackMock).toHaveBeenCalledTimes(2);
        expect(resultCallbackMock).toHaveBeenCalledTimes(2);
    });

    test("Runs all tests if excludedTag is present and test does not have tags", async () => {
        const runner = new TestRunner({
            exclude: "broken",
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);

        await runner.run("test/FactSkill/fact-skill-tests.common.yml");

        // Runs only 3 of the 3 tests (the ones including alexa but not broken)
        expect(messageCallbackMock).toHaveBeenCalledTimes(6);
        expect(resultCallbackMock).toHaveBeenCalledTimes(6);
    });

    test("Runs no tests if includedTag is present and test does not have tags", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            include: "alexa",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.utterance).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.result).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);

        await runner.run("test/FactSkill/fact-skill-tests.common.yml");

        // Runs 0 of the 3 tests
        expect(messageCallbackMock).toHaveBeenCalledTimes(0);
        expect(resultCallbackMock).toHaveBeenCalledTimes(0);
    });

    test("unsubscribe()", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        const messageCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.description).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(error).toBeUndefined();
            expect(test.interactionResults).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);
        runner.unsubscribe("message");
        runner.unsubscribe("result");
  
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        
        expect(messageCallbackMock).toHaveBeenCalledTimes(0);
        expect(resultCallbackMock).toHaveBeenCalledTimes(0);
    });

    test("error", async () => {
        const runner = new TestRunner({
            type: CONSTANTS.TYPE.e2e,
        });
        const messageCallback = (error) => {
            expect(error).toBeDefined();
        };
        const resultCallback = (error) => {
            expect(error).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);
        const loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});

        try {
            await runner.run("test/FactSkill/fact-skill-tests.yml");
        } catch (error) {
            expect(error).toBeDefined();
        }

        expect(loggerSpy).toHaveBeenCalledTimes(2);
        expect(resultCallbackMock).toHaveBeenCalledTimes(1);
    });

    test("batchEnabled true", async () => {
        const runner = new TestRunner({
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "123",
        });
  
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(mockMessage.mock.calls.length).toBe(3);
        expect(process.env.JEST_STARE_COVERAGE_LINK).toBeUndefined();
    });

    test("test variable for coverage is set if unit testing is active", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            include: "alexa",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(process.env.JEST_STARE_COVERAGE_LINK).toBe("../coverage/lcov-report/index.html");
    });

    test("batchEnabled false", async () => {
        const runner = new TestRunner({
            batchEnabled: false,
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "123",
        });

        await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(mockMessage.mock.calls.length).toBe(6);
    });

    test("batchEnabled true, asyncMode true", async () => {
        const runner = new TestRunner({
            asyncE2EWaitInterval: 1,
            asyncMode: true,
            batchEnabled: true,
            maxAsyncE2EResponseWaitTime: 3,
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "async token",
        });

        const mockReturn = [{}, {}, {}];
        for (let i=0; i < 3; i++) {
            // Usual behavior, first result is empty and arrays with results appear then
            mockGetConversationResults
                .mockReturnValueOnce([])
                .mockReturnValueOnce(mockReturn)
                .mockReturnValueOnce(mockReturn);
        }

        await runner.run("test/FactSkill/fact-skill-tests.yml");
        // each of the three interactions have two utterances, plus the call that comes with an empty array
        expect(mockGetConversationResults.mock.calls.length).toBe(9);
    });

    test("batchEnabled true, asyncMode true, goto ", async () => {
        const runner = new TestRunner({
            asyncE2EWaitInterval: 1,
            asyncMode: true,
            batchEnabled: true,
            maxAsyncE2EResponseWaitTime: 3,
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "async token",
        });

        const mockReturn = [{}, {}, {}];
        for (let i=0; i < 3; i++) {
            // Usual behavior, first result is empty and arrays with results appear then
            mockGetConversationResults
                .mockReturnValueOnce([])
                .mockReturnValueOnce(mockReturn)
                .mockReturnValueOnce(mockReturn);
        }

        await runner.run("test/FactSkill/fact-skill-tests.goto.yml");
        // each of the three interactions have two utterances, plus the call that comes with an empty array
        expect(mockGetConversationResults.mock.calls.length).toBe(5);
    });    

    test("getInvoker default value", async () => {
        Configuration.configure({});

        const testSuite = new TestSuite();
        const runner = new TestRunner();
        
        expect(runner.getInvoker(testSuite)).toBe("VirtualAlexaInvoker");
    });

    test("getInvoker when invoker is defined", async () => {
        Configuration.configure({
            invoker: "VirtualDeviceInvoker",
        });

        const testSuite = new TestSuite();
        const runner = new TestRunner();
        
        expect(runner.getInvoker(testSuite)).toBe("VirtualDeviceInvoker");
    });

    test("getInvoker when platform and type are defined", async () => {
        Configuration.configure({
            platform: "alexa",
            type: "e2e",
        });

        const testSuite = new TestSuite();
        const runner = new TestRunner();
        expect(runner.getInvoker(testSuite)).toBe("VirtualDeviceInvoker");
    });

    test("Filter for request and response", async () => {
        let requestFilterCalled = false;
        let responseFilterCalled = false;

        const runner = new TestRunner({
            filter: {
                onRequest: (test, request) => {
                    expect(test).toBeDefined();
                    expect(request.context).toBeDefined();
                    expect(request.request).toBeDefined();
                    requestFilterCalled = true;
                },
                onResponse: (test, response) => {
                    expect(test).toBeDefined();
                    expect(response.response).toBeDefined();
                    responseFilterCalled = true;
                },
            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        expect(requestFilterCalled).toBe(true);
        expect(responseFilterCalled).toBe(true);
    });

    test("Filter for test suite start and stop", async () => {
        let testSuiteStart = false;
        let testSuiteEnd = false;

        const runner = new TestRunner({
            filter: {
                onTestSuiteEnd: (results) => {
                    expect(results).toBeDefined();
                    testSuiteEnd = true;
                },
                onTestSuiteStart: (testSuite) => {
                    expect(testSuite).toBeDefined();
                    expect(testSuite.locale).toBe("en-US");

                    testSuiteStart = true;
                },
            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        expect(testSuiteStart).toBe(true);
        expect(testSuiteEnd).toBe(true);
    });

    test("Filter for test start and stop", async () => {
        let testStart = false;
        let testEnd = false;

        const runner = new TestRunner({
            filter: {
                onTestEnd: (test, testResult) => {
                    expect(test).toBeDefined();
                    expect(testResult).toBeDefined();
                    testEnd = true;
                },
                onTestStart:(test) => {
                    expect(test).toBeDefined();
                    testStart = true;
                },

            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        await runner.run("test/FactSkill/fact-skill-tests.yml");

        expect(testStart).toBe(true);
        expect(testEnd).toBe(true);
    });

    test("Filter for variable replacement", async () => {
        let testStart = false;
        let testEnd = false;

        const runner = new TestRunner({
            filter: {
                onTestEnd: (test, testResult) => {
                    expect(test).toBeDefined();
                    expect(testResult).toBeDefined();
                    expect(test.interactions[0].assertions[0].value).toBe("A value and a first");
                    expect(test.interactions[1].assertions[0].value).toEqual(["2", "value", "{thirdVariable}"]);
                    expect(test.interactions[2].assertions[0].value).toBe("nothing at all");

                    testEnd = true;
                },
                onTestStart:(test) => {
                    expect(test).toBeDefined();
                    testStart = true;
                },
                resolve: async (variable, interaction) => {
                    if (variable === "firstVariable") return "first";
                    if (variable === "secondVariable") {
                        await Util.sleep(10);
                        return 2;
                    }
                    expect(interaction).toBeDefined();
                },

            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        await runner.run("test/FactSkill/fact-skill-with-replaced-variables.yml");

        expect(testStart).toBe(true);
        expect(testEnd).toBe(true);
    });

    test("Filter for variable replacement works correctly in batch mode", async () => {
        let testStart = false;
        let testEnd = false;

        const runner = new TestRunner({
            filter: {
                onTestEnd: (test, testResult) => {
                    expect(test).toBeDefined();
                    expect(testResult).toBeDefined();
                    expect(test.interactions[0].assertions[0].value).toBe("A value and a first");
                    expect(test.interactions[1].assertions[0].value).toEqual(["2", "value", "{thirdVariable}"]);
                    expect(test.interactions[2].assertions[0].value).toBe("nothing at all");

                    testEnd = true;
                },
                onTestStart:(test) => {
                    expect(test).toBeDefined();
                    testStart = true;
                },
                resolve: async (variable, interaction) => {
                    if (variable === "firstVariable") return "first";
                    if (variable === "secondVariable") {
                        await Util.sleep(10);
                        return 2;
                    }
                    expect(interaction).toBeDefined();
                },

            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
            type: "e2e",
            virtualDeviceToken: "123",

        });

        await runner.run("test/FactSkill/fact-skill-with-replaced-variables.yml");

        expect(testStart).toBe(true);
        expect(testEnd).toBe(true);
    });

    test("execute test on parallel", async () => {
        Configuration.configure({
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "anotherToken",
        });

        const script = `
--- 
- LaunchRequest: welcome
`;

        await Promise.all(["A", "B", "C"].map(async (token) => {
            const configurationOverride = { locale: "en-US", type: CONSTANTS.TYPE.e2e, virtualDeviceToken: "token"+token};
            const parser = new TestParser();
            parser.load(script);
            
            const testSuite = parser.parse(configurationOverride);
            testSuite._fileName = "test";
    
            const runner = new TestRunner();
            return await runner.runSuite(testSuite);
        }));

        expect(mockVirtualDevice.mock.calls.length).toBe(3);

        const expected = ["tokenA", "tokenB", "tokenC"];
        const received = [
            mockVirtualDevice.mock.calls[0][0].token,
            mockVirtualDevice.mock.calls[1][0].token,
            mockVirtualDevice.mock.calls[2][0].token,
        ];

        expect(received).toEqual(
            expect.arrayContaining(expected),
        );

    });

    test("operator on test", async() => {
        const runner = new TestRunner({
            exclude: "broken",
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        const results = await runner.run("test/FactSkill/fact-skill-operators.yml");
        
        expect(results.length).toEqual(1);
        expect(results[0].test.description).toEqual("Gets a new fact intent");

        expect(results[0].interactionResults[0].interaction.assertions[0].operator).toBe("==");
        expect(results[0].interactionResults[0].error).toBeUndefined();
        expect(results[0].interactionResults[1].interaction.assertions[0].operator).toBe("=~");
        expect(results[0].interactionResults[1].error).toBeUndefined();
        expect(results[0].interactionResults[2].interaction.assertions[0].operator).toBe("==");
        expect(results[0].interactionResults[2].error).toBeUndefined();
        expect(results[0].interactionResults[3].interaction.assertions[0].operator).toBe("=~");
        expect(results[0].interactionResults[3].error).toBeUndefined();
        expect(results[0].interactionResults[4].interaction.assertions[0].operator).toBe("==");
        expect(results[0].interactionResults[4].error).toBeDefined();
        expect(results[0].interactionResults[5].interaction.assertions[0].operator).toBe("==");
        expect(results[0].interactionResults[5].error).toBeDefined();
    });

    test("utterances replaced by localized values", async () => {
        const runner = new TestRunner({
            testDirectory: "test/MultiLocaleFactSkill",
        });
        const results = await runner.run("test/MultiLocaleFactSkill/localizedUtterances.yml");
        expect(results.length).toEqual(4);

        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[0].test.testSuite.description).toEqual("test description de");
        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[0].test.description).toEqual("test de");
        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[0].interactionResults[0].interaction.utterance).toEqual("eine wirklichkeit");
        expect(results[0].interactionResults[0].error).toBeUndefined();

        expect(results[1].test.testSuite.description).toEqual("test description en");
        expect(results[1].test.description).toEqual("test en");
        expect(results[1].interactionResults[0].interaction.utterance).toEqual("tell me a fact");
        expect(results[1].interactionResults[0].error).toBeUndefined();

        expect(results[2].test.testSuite.description).toEqual("test description en");
        expect(results[2].test.description).toEqual("test en");
        expect(results[2].interactionResults[0].interaction.utterance).toEqual("tell me a fact");
        expect(results[2].interactionResults[0].error).toBeUndefined();

        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[3].test.testSuite.description).toEqual("test description ja");
        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[3].test.description).toEqual("test ja");
        // eslint-disable-next-line spellcheck/spell-checker
        expect(results[3].interactionResults[0].interaction.utterance).toEqual("事実を教えてください");
        expect(results[3].interactionResults[0].error).toBeUndefined();

    });
});

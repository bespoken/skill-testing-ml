const Configuration = require("../lib/runner/Configuration");
const CONSTANTS = require("../lib/util/Constants");
const mockMessage = require("virtual-device-sdk").mockMessage;
const TestRunner = require("../lib/runner/TestRunner");
const TestSuite = require("../lib/test/TestSuite");

describe("test runner", () => {
    beforeEach(() => {
        mockMessage.mockClear();
        Configuration.singleton = undefined;
    });

    test("subscribe()", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
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
        
        expect(messageCallbackMock).toHaveBeenCalledTimes(6);
        expect(resultCallbackMock).toHaveBeenCalledTimes(6);
    });

    test("unsubscribe()", async () => {
        const runner = new TestRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
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
  
        try {
            await runner.run("test/FactSkill/fact-skill-tests.yml");
        } catch (error) {
            expect(error).toBeDefined();
        }

        expect(resultCallbackMock).toHaveBeenCalledTimes(1);
    });

    test("batchEnabled true", async () => {
        const runner = new TestRunner({
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "123"
        });
  
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(mockMessage.mock.calls.length).toBe(3);
    });

    test("batchEnabled false", async () => {
        const runner = new TestRunner({
            batchEnabled: false,
            type: CONSTANTS.TYPE.e2e,
            virtualDeviceToken: "123"
        });
  
        await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(mockMessage.mock.calls.length).toBe(6);
    });

    test("getInvoker default value", async () => {
        Configuration.configure({});

        const testSuite = new TestSuite();
        const runner = new TestRunner();
        
        expect(runner.getInvoker(testSuite)).toBe("VirtualAlexaInvoker");
    });

    test("getInvoker when invoker is defined", async () => {
        Configuration.configure({
            invoker: "VirtualDeviceInvoker"
        });

        const testSuite = new TestSuite();
        const runner = new TestRunner();
        
        expect(runner.getInvoker(testSuite)).toBe("VirtualDeviceInvoker");
    });

    test("getInvoker when platform and type are defined", async () => {
        Configuration.configure({
            platform: "alexa",
            type: "e2e"
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
                onTestSuiteStart: (testSuite, context) => {
                    expect(testSuite).toBeDefined();
                    expect(context).toBeDefined();
                    expect(context.context).toBe("context");
                    expect(testSuite.locale).toBe("en-US");

                    testSuiteStart = true;
                },
            },
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US",
        });

        await runner.run("test/FactSkill/fact-skill-tests.yml", {
            context: "context"
        });

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
});

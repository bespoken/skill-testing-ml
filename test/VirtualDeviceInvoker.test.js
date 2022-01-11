const addFilter = require("virtual-device-sdk").mockAddFilter;
const addHomophones = require("virtual-device-sdk").mockAddHomophones;
const Configuration = require("../lib/runner/Configuration");
const CONSTANTS = require("../lib/util/Constants");
const LoggingErrorHelper = require("../lib/util/LoggingErrorHelper");
const message = require("virtual-device-sdk").mockMessage;
const mockBatchMessageAsyncMode = require("virtual-device-sdk").mockBatchMessageAsyncMode;
const mockGetConversationResults = require("virtual-device-sdk").mockGetConversationResults;
const mockVirtualDevice = require("virtual-device-sdk").mockVirtualDevice;

const spaceFactMessage = require("virtual-device-sdk").spaceFactMessage;
const TestParser = require("../lib/test/TestParser");
const TestRunner = require("../lib/runner/TestRunner");
const VirtualDeviceInvoker = require("../lib/runner/VirtualDeviceInvoker");

let loggerSpy;

describe("virtual device integration", () => {
    let _invoker;
    let _interaction;

    describe("interactions", () => {

        beforeEach(() => {
            _invoker = new VirtualDeviceInvoker(undefined);
            _invoker.before({ invocationName: "space fact", virtualDeviceToken: "123" });
    
            _interaction = {
                test: {
                    testSuite: {
                        invocationName: "space fact",
                        virtualDeviceToken: "123",
                    },
                },
            };
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
            message.mockClear();
        });
    
        test("Any utterance", async () => {
            _interaction.utterance = "test";
            _interaction.relativeIndex = 1;
    
            await _invoker.invokeBatch([_interaction]);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message.mock.calls[0][0][0].text).toBe("test");
        });

        test("homophones", async () => {
            _interaction.test.testSuite.homophones = {
                "lock": ["log"],
                "white": ["wide","wife"],
            };
            _interaction.utterance = "test";
            _invoker.before(_interaction.test.testSuite);
            await _invoker.invokeBatch([_interaction]);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message.mock.calls[0][0][0].text).toBe("test");

            expect(addHomophones).toHaveBeenCalledTimes(2);
            expect(addHomophones).toHaveBeenCalledWith("lock", ["log"]);
            expect(addHomophones).toHaveBeenCalledWith("white", ["wide","wife"]);
        });

        test("throw error if virtualDeviceToken is missing", async () => {
            expect(function() {
                _invoker.before({ invocationName: "123" });
            }).toThrow();

        });

        test("catch exception on virtual device call", async () => {
            _interaction.utterance = "exception";
            await _invoker.invokeBatch([_interaction]);
        });

        test("include raw data", async () => {
            _invoker.before({ includeRaw: false, invocationName: "space fact", virtualDeviceToken: "123" });
            expect(_invoker.debugMode).toBe(false);
            _invoker.before({ includeRaw: true, invocationName: "space fact", virtualDeviceToken: "123" });
            expect(_invoker.debugMode).toBe(true);
        });
    });

});

describe("virtual device runner", () => {
    describe("basic tests", () => {
        beforeEach(() => {
            Configuration.configure({
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                // eslint-disable-next-line spellcheck/spell-checker
                virtualDeviceToken: "space fact",
                voiceId: "voiceId",
            });
            mockVirtualDevice.mockClear();
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs fact skill test", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-tests.common-with-variables.yml");
            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("Hi");
            expect(results[0].interactionResults[1].error).toBeUndefined();
            expect(results[1].interactionResults[0].error).toBeUndefined();
            // We do some case-sensitivity tests - prompt and transcript are not case-sensitive, other fields are
            expect(results[1].interactionResults[1].error).toContain("cardTitle");
            expect(results[2].test.description).toEqual("Test 3");

            // Make sure phrases are passed correctly when the assertion value is an array
            // First batch call - first interaction has no response, second has one
            let batchMessagePayload = spaceFactMessage.mock.calls[0][0];
            expect(batchMessagePayload[0].phrases.length).toBe(0);
            expect(batchMessagePayload[1].phrases.length).toBe(1);
            expect(batchMessagePayload[1].phrases[0]).toBe(".*Here's your fact*");

            // Second batch call - first interaction has a collection of values
            batchMessagePayload = spaceFactMessage.mock.calls[1][0];
            expect(batchMessagePayload[0].phrases.length).toBe(2);
            expect(batchMessagePayload[0].phrases[0]).toEqual("/.*you can say.*/i");
            expect(batchMessagePayload[0].phrases[1]).toBe("A phrase");
        });

        test("use token, locale and voiceId when is on the configuration", async () => {
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].token).toBe("space fact");
            expect(mockVirtualDevice.mock.calls[0][0].locale).toBe("en-US");
            expect(mockVirtualDevice.mock.calls[0][0].voiceID).toBe("voiceId");
        });
    });
    
    describe("virtualDeviceToken", () => {
        let config = {};
        beforeEach(() => {
            config = {
                type: CONSTANTS.TYPE.e2e,
            };
            mockVirtualDevice.mockClear ();
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            Configuration.singleton = undefined;
            loggerSpy.mockRestore();
        });

        test("one token", async () => {
            config.virtualDeviceToken = "space fact";
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].token).toBe("space fact");
            expect(mockVirtualDevice.mock.calls[0][0].locale).toBe("en-US");
        });

        test("alexa token", async () => {
            config.virtualDeviceToken = {
                alexa: "alexaToken",
                google: "googleToken",
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].token).toBe("alexaToken");
            expect(mockVirtualDevice.mock.calls[0][0].locale).toBe("en-US");
        });

        test("google token", async () => {
            config.platform = "google";
            config.virtualDeviceToken = {
                alexa: "alexaToken",
                google: "googleToken",
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].token).toBe("googleToken");
            expect(mockVirtualDevice.mock.calls[0][0].locale).toBe("en-US");
        });

        test("alexa token with locales", async () => {
            config.virtualDeviceToken = {
                alexa: {
                    // eslint-disable-next-line spellcheck/spell-checker
                    "de-DE": "alexaTokenDE",
                    // eslint-disable-next-line spellcheck/spell-checker
                    "en-US": "alexaTokenUS",
                },
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].token).toBe("alexaTokenUS");
            expect(mockVirtualDevice.mock.calls[0][0].locale).toBe("en-US");
        });

    });

    describe("configuration parameters", () => {
        let config = {};
        beforeEach(() => {
            config = {
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "token",
            };
            mockVirtualDevice.mockClear ();
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            Configuration.singleton = undefined;
            loggerSpy.mockRestore();
        });

        test("deviceLocation", async () => {
            config.deviceLocation = {
                lat: 40.00,
                lng: 50.00,
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].locationLat).toBe(40.00);
            expect(mockVirtualDevice.mock.calls[0][0].locationLong).toBe(50.00);
        });

        test("stt", async () => {
            config.stt = "witai";
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].stt).toBe("witai");
        });


        test("deviceLocation and stt on yml", async () => {
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].stt).toBe("witai");
            expect(mockVirtualDevice.mock.calls[0][0].locationLat).toBe(40.00);
            expect(mockVirtualDevice.mock.calls[0][0].locationLong).toBe(50.00);
        });

        test("client", async () => {
            config.client = "dashboard";
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].client).toBe("dashboard");
        });

        test("screenMode", async () => {
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].screenMode).toBe("OFF");
        });

        test("projectId", async () => {
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].projectId).toBe("parrotAgent");
        });

        test("phone number and extra parameters", async () => {
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].phoneNumber).toBe("+18568889001");
            expect(mockVirtualDevice.mock.calls[0][0].twilio_speech_timeout).toEqual(2);
            expect(mockVirtualDevice.mock.calls[0][0].twilio_timeout).toEqual(10);
        });

        test("missing phone number for twilio test", async () => {
            config.virtualDeviceToken = "twilio-token";
            Configuration.configure(config);
            const runner = new TestRunner();
            try {
                await runner.run("test/FactSkill/fact-skill-test.common.yml");
                throw new Error("validation was not executed");
            } catch (error) {
                expect(error.message).toBe("A valid phoneNumber property must be defined for IVR tests in the " +
                    "testing.json or the YML test file under the config element");
            }
        });

        test("replyTimeout is greater than maxAsyncE2EResponseWaitTime", async () => {
            config.replyTimeout = 65;
            Configuration.configure(config);
            const runner = new TestRunner();
            await expect(runner.run("test/FactSkill/fact-skill-test.common.yml"))
                .rejects
                .toThrow("The replyTimeout property must be less than or equal to the maxAsyncE2EResponseWaitTime property in the " +
                "testing.json or the YML test file under the config element");
        });

        test("platform", async () => {
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0].platform).toBe("alexa");
        });

        test("sms platform", async () => {
            config.platform = "sms";
            Configuration.configure(config);
            const runner = new TestRunner();
            try {
                await runner.run("test/FactSkill/fact-skill-with-replaced-variables.yml");
            } catch (error) {
                expect(error.message).toBe(undefined);
            }
        });

        test("whatsapp platform", async () => {
            config.platform = "whatsapp";
            Configuration.configure(config);
            const runner = new TestRunner();
            try {
                await runner.run(
                    "test/FactSkill/fact-skill-with-replaced-variables.yml"
                );
            } catch (error) {
                expect(error.message).toBe(undefined);
            }
        });
    });

    describe("control flow tests", () => {
        beforeAll(() => {
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});

            return Configuration.configure({
                asyncMode: true, //should be ignored
                batchEnabled: false,
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                // eslint-disable-next-line spellcheck/spell-checker
                virtualDeviceToken: "space fact",
            });
        });

        test("Test goto", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/control-flow-tests.common.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].passed).toBe(true);
            expect(results[0].interactionResults[0].goto).toBe("Get New Fact");
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].interaction.utterance).toBe("Get New Fact");
            expect(results[0].interactionResults[1].passed).toBe(false);

            // Check on exit
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].passed).toBe(true);
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[1].interactionResults[0].exited).toBe(true);
        });
    });

    describe("virtual device async mode", () => {
        beforeAll(() => {
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        });

        beforeEach(() => {
            mockBatchMessageAsyncMode.mockClear();
            mockGetConversationResults.mockClear();
            Configuration.reset();
            return Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token",
            });
        });

        afterAll(() => {
            mockGetConversationResults.restore();
        });

        test("Test flow with async", async () => {
            const runner = new TestRunner();

            const conversationIdPromise = new Promise((resolve) => {
                runner.subscribe("conversation_id", (error, conversation_id) => {
                    resolve(conversation_id);
                });
            });
            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");

            const conversation_id = await conversationIdPromise;

            expect(results.length).toEqual(3);
            expect(conversation_id).toEqual("dummy-id");
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("Hi");
            expect(results[0].interactionResults[1].error).toBeUndefined();

        });

        test("Test flow with async when there's no results coming back", async () => {
            const runner = new TestRunner();
            mockGetConversationResults.mockReturnValue({
                results: [],
                status: "IN_PROGRESS",
            });

            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");

            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");

            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe(
                "Timeout exceeded while waiting for the interaction response. Increase the maxAsyncE2EResponseWaitTime value to fix this issue. " +
                "More info at: https://read.bespoken.io/end-to-end/guide/."
            );
        });

        test("Test flow with async when getting conversation id throws an exception", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token throws",
            });
            const runner = new TestRunner();
            mockGetConversationResults.mockReturnValue([]);

            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");

            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");

            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toContain("Network Error");
        });

        test("Test flow with async when there's an exception", async () => {
            const runner = new TestRunner();
            mockGetConversationResults.mockImplementation(() => {
                const error = JSON.stringify({
                    error: "Virtual Device Token is invalid",
                    errorCategory: "user",
                });
                throw error;
            });
            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");

            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");

            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].error).toBeDefined();
            expect(results[0].interactionResults[0].error.error_category).toBeDefined();
            expect(results[0].interactionResults[0].error.error_category).toBe("user");
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe(
                "Virtual Device Token is invalid");

        });

        test("Test flow with async when there's PAUSE instruction", async () => {
            mockGetConversationResults
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}, {}], status: "COMPLETED"});

            const script = `
--- 
- LaunchRequest: welcome
- $PAUSE 2
- help: you can say
`;
            const parser = new TestParser();
            parser.load(script);
            const testSuite = parser.parse();
            testSuite._fileName = "test";
    
            const runner = new TestRunner();
            const results = await runner.runSuite(testSuite);

            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Test 1");

            expect(results[0].interactionResults.length).toBe(3);
            expect(results[0].interactionResults[0].interaction.utterance).toBe("LaunchRequest");
            expect(results[0].interactionResults[1].interaction.utterance).toBe("$PAUSE 2");
            expect(results[0].interactionResults[2].interaction.utterance).toBe("help");
        });

        test("Test flow with async when there's PAUSE instruction, missing time", async () => {
            mockGetConversationResults
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}, {}], status: "COMPLETED"});

            const script = `
--- 
- LaunchRequest: welcome
- $PAUSE
- help: you can say
`;
            const parser = new TestParser();
            parser.load(script);
            const testSuite = parser.parse();
            testSuite._fileName = "test";
    
            const runner = new TestRunner();
            const results = await runner.runSuite(testSuite);

            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Test 1");

            expect(results[0].interactionResults.length).toBe(3);
            expect(results[0].interactionResults[0].interaction.utterance).toBe("LaunchRequest");
            expect(results[0].interactionResults[1].interaction.utterance).toBe("$PAUSE");
            expect(results[0].interactionResults[1].interaction.pauseSeconds).toBe(0);
            expect(results[0].interactionResults[2].interaction.utterance).toBe("help");
        });

        test("Test flow with async when there's PAUSE instruction, wrong time", async () => {
            mockGetConversationResults
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}], status: "IN-PROGRESS"})
                .mockReturnValueOnce({results: [{}, {}, {}], status: "COMPLETED"});

            const script = `
--- 
- LaunchRequest: welcome
- $PAUSE s
- help: you can say
`;
            const parser = new TestParser();
            parser.load(script);
            const testSuite = parser.parse();
            testSuite._fileName = "test";
    
            const runner = new TestRunner();
            const results = await runner.runSuite(testSuite);

            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Test 1");

            expect(results[0].interactionResults.length).toBe(3);
            expect(results[0].interactionResults[0].interaction.utterance).toBe("LaunchRequest");
            expect(results[0].interactionResults[1].interaction.utterance).toBe("$PAUSE s");
            expect(results[0].interactionResults[1].interaction.pauseSeconds).toBe(0);
            expect(results[0].interactionResults[2].interaction.utterance).toBe("help");
        });

        test("Test flow async mode with retryOn:[] and retryNumber: 2", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                retryNumber: 3,
                retryOn: [],
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token error on result",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-test.common.yml");

            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe("Call was not answered");
            expect(mockBatchMessageAsyncMode.mock.calls.length).toBe(1);
        });

        test("Test flow async mode with retryOn:[554] and retryNumber: 3", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                retryNumber: 3,
                retryOn: [554],
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token error on result",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-test.common.yml");

            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe("Call was not answered");
            expect(mockBatchMessageAsyncMode.mock.calls.length).toBe(4);
        });

        test("Test flow async mode with retryOn:[554] and invalid retryNumber", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                retryNumber: "invalid",
                retryOn: [554],
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token error on result",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-test.common.yml");

            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe("Call was not answered");
            expect(mockBatchMessageAsyncMode.mock.calls.length).toBe(2);
        });

        test("Test flow async mode with retryOn:[554] and retryNumber greater than max value", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                retryNumber: 10,
                retryOn: [554],
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token error on result",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-test.common.yml");

            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[0].interactionResults[0].errorOnProcess).toBe("Call was not answered");
            expect(mockBatchMessageAsyncMode.mock.calls.length).toBe(6);
        });

        test("Test flow with async with request expressions as settings", async () => {
            mockGetConversationResults
                .mockReturnValueOnce({results: [{}], status: "COMPLETED"});

            const script = `
--- 
- LaunchRequest:
    - request.value1: value1
    - request.value2: value2
    - set key3: value3
`;
            const parser = new TestParser();
            parser.load(script);
            const testSuite = parser.parse();
            testSuite._fileName = "test";
    
            const runner = new TestRunner();
            const results = await runner.runSuite(testSuite);

            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Test 1");

            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].passed).toBe(true);
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(mockBatchMessageAsyncMode.mock.calls.length).toBe(1);
            const messages = mockBatchMessageAsyncMode.mock.calls[0][0];
            expect(messages[0].settings).toEqual({ key3: "value3", value1: "value1", value2: "value2"});

        });
    });

    describe("Request Filter", () => {
        beforeEach(() => {
            addFilter.mockRestore();
        });

        test("Test flow with async with filters", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncE2EWaitInterval: 1,
                asyncMode: true,
                batchEnabled: true,
                filter: {
                    onRequest: () => {},
                },
                invocationName: "space fact",
                locale: "en-US",
                maxAsyncE2EResponseWaitTime: 3,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token throws",

            });

            const runner = new TestRunner();

            await runner.run("test/FactSkill/fact-skill-tests.yml");
            // One call for each test
            expect(addFilter).toHaveBeenCalledTimes(3);
        });

        test("Test flow with batch with filters", async () => {
            Configuration.reset();
            Configuration.configure({
                asyncMode: false,
                batchEnabled: true,
                filter: {
                    onRequest: () => {},
                },
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "async token throws",

            });

            const runner = new TestRunner();

            await runner.run("test/FactSkill/fact-skill-tests.yml");
            // One call for each test
            expect(addFilter).toHaveBeenCalledTimes(3);
        });

        test("Test flow with sequential with filters", async () => {
            Configuration.reset();
            Configuration.configure({
                batchEnabled: false,
                filter: {
                    onRequest: () => {},
                },
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });

            const runner = new TestRunner();

            await runner.run("test/FactSkill/fact-skill-tests.yml");
            // One call for each utterance
            expect(addFilter).toHaveBeenCalledTimes(6);
        });
    });

    describe("edge case tests", () => {
        beforeAll(() => {
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});

            return Configuration.configure({
                handler: "test/ExceptionSkill/index.handler",
                interactionModel: "test/ExceptionSkill/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            loggerSpy.mockRestore();
        });

        test("no response", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/ExceptionSkill/no-response-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
        });

        test("ignore card.type when platform is google", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                platform: CONSTANTS.PLATFORM.google,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });            
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-with-card-type.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[1].error).toBeUndefined();
        });

        test("ignore external errors", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                ignoreExternalErrors: true,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-throw-error.yml");
            expect(results.length).toEqual(4);

            expect(results[0].skipped).toBe(false);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].error).toBeUndefined();

            expect(results[1].skipped).toBe(true);
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].error).toBeDefined();
            expect(results[1].interactionResults[0].error.error_category).toBeDefined();
            expect(results[1].interactionResults[0].errorOnProcess).toBeDefined();
        });

        test("fail on external error", async () => {
            Configuration.singleton = undefined;

            Configuration.configure({
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-throw-error.yml");
            expect(results.length).toEqual(4);

            expect(results[0].skipped).toBe(false);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].error).toBeUndefined();

            expect(results[1].skipped).toBe(false);
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].error).toBeDefined();
            expect(results[1].interactionResults[0].error.error_category).toBe("system");
            expect(results[1].interactionResults[0].error.message).toBe("Error from virtual device");
            expect(results[1].interactionResults[0].errorOnProcess).toBeDefined();

            expect(results[2].skipped).toBe(false);
            expect(results[2].interactionResults.length).toBe(1);
            expect(results[2].interactionResults[0].error).toBeDefined();
            expect(results[2].interactionResults[0].errorOnProcess).toBeDefined();
            expect(results[2].interactionResults[0].errorOnProcess).toBe("Error from virtual device on root");
        });

        test("response with errors", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-with-error.yml");
            expect(results.length).toEqual(2);

            expect(results[0].skipped).toBe(false);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].error).toBeUndefined();

            expect(results[1].skipped).toBe(false);
            expect(results[1].interactionResults.length).toBe(3);

            expect(results[1].interactionResults[1].error).toBeDefined();
            expect(results[1].interactionResults[1].errorOnProcess).toBe(false);
            expect(results[1].interactionResults[1].errors.length).toBe(2);
            expect(results[1].interactionResults[1].errors[0]).toContain("Expected value at [prompt] to ==");
            expect(results[1].interactionResults[1].errors[1]).toContain("Expected value at [cardTitle] to ==");
            expect(results[1].interactionResults[2].error).toBeDefined();
            expect(results[1].interactionResults[2].error.message).toBe("error message");
            expect(results[1].interactionResults[2].errorOnProcess).toBe("error message");
            expect(results[1].interactionResults[2].errors).toBeUndefined();
        });

        test("ignore properties on demand", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                ignoreProperties: {
                    google: {
                        paths: "streamURL, display.array[0].url",
                        type: "e2e",
                    },
                },
                platform: CONSTANTS.PLATFORM.google,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact",
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-ignore-props.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[1].error).toBeUndefined();
        });
    });

    describe("operators", () =>{
        beforeEach(() => {
            Configuration.configure({
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                // eslint-disable-next-line spellcheck/spell-checker
                virtualDeviceToken: "space fact",
                voiceId: "voiceId",
            });
            mockVirtualDevice.mockClear();
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("different operators", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-operators.yml");

            expect(results.length).toEqual(1);
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
            expect(results[0].interactionResults[6].interaction.assertions[0].operator).toBe("!=");
            expect(results[0].interactionResults[6].error).toBeDefined();
            expect(results[0].interactionResults[7].interaction.assertions[0].operator).toBe("!=");
            expect(results[0].interactionResults[7].error).toBeDefined();
            
            expect(results[0].interactionResults[8].error).toBeDefined();
            expect(results[0].interactionResults[9].error).toBeDefined();

            expect(results[0].interactionResults[10].error).toBeUndefined();
        });
    });
});

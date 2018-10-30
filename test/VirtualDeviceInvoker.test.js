const addHomophones = require("virtual-device-sdk").mockAddHomophones;
const Configuration = require("../lib/runner/Configuration");
const CONSTANTS = require("../lib/util/Constants");
const message = require("virtual-device-sdk").mockMessage;
const mockVirtualDevice = require("virtual-device-sdk").mockVirtualDevice;
const spaceFactMessage = require("virtual-device-sdk").spaceFactMessage;
const TestRunner = require("../lib/runner/TestRunner");
const VirtualDeviceInvoker = require("../lib/runner/VirtualDeviceInvoker");

describe("virtual device integration", () => {
    let _invoker;
    let _interaction;

    describe("interactions", async () => {

        beforeEach(() => {
            _invoker = new VirtualDeviceInvoker(undefined);
            _invoker.before({ invocationName: "space fact", virtualDeviceToken: "123" });
    
            _interaction = {
                test: {
                    testSuite: {
                        invocationName: "space fact",
                        virtualDeviceToken: "123"
                    }
                }
            };
            message.mockClear();
        });

        /*
        // Removing support for special utters on virtual device
        test("LaunchRequest", async () => {
            _interaction.utterance = "LaunchRequest";
    
            await _invoker.invoke(_interaction);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message.mock.calls[0][0][0].text).toBe("open space fact");
        });
    
        test("AudioPlayer", async () => {
            _interaction.utterance = "AudioPlayer.";
    
            await _invoker.invokeBatch([_interaction]);
    
            expect(message).not.toHaveBeenCalled();
        });
    
        test("SessionEndedRequest", async () => {
            _interaction.utterance = "SessionEndedRequest";
    
            await _invoker.invokeBatch([_interaction]);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message.mock.calls[0][0][0].text).toBe("exit");
        });
    
        test("First interaction is not a launch request", async () => {
            _interaction.utterance = "hi";
            _interaction.relativeIndex = 0;
    
            await _invoker.invokeBatch([_interaction]);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message.mock.calls[0][0][0].text).toBe("ask space fact to hi");
        });
        */
    
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
                voiceId: "voiceId"
            });
            mockVirtualDevice.mockClear();
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs fact skill test", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");
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
            
            expect(mockVirtualDevice.mock.calls[0][0]).toBe("space fact");
            expect(mockVirtualDevice.mock.calls[0][1]).toBe("en-US");
            expect(mockVirtualDevice.mock.calls[0][2]).toBe("voiceId");
        });
    });
    
    describe("virtualDeviceToken", () => {
        let config = {};
        beforeEach(() => {
            config = {
                type: CONSTANTS.TYPE.e2e,
            };
            mockVirtualDevice.mockClear ();
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("one token", async () => {
            config.virtualDeviceToken = "space fact"
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0]).toBe("space fact");
            expect(mockVirtualDevice.mock.calls[0][1]).toBe("en-US");
        });

        test("alexa token", async () => {
            config.virtualDeviceToken = {
                alexa: "alexaToken",
                google: "googleToken",
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0]).toBe("alexaToken");
            expect(mockVirtualDevice.mock.calls[0][1]).toBe("en-US");
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
            
            expect(mockVirtualDevice.mock.calls[0][0]).toBe("googleToken");
            expect(mockVirtualDevice.mock.calls[0][1]).toBe("en-US");
        });

        test("alexa token with locales", async () => {
            config.virtualDeviceToken = {
                alexa: {
                    // eslint-disable-next-line spellcheck/spell-checker
                    "de-DE": "alexaTokenDE",
                    // eslint-disable-next-line spellcheck/spell-checker
                    "en-US": "alexaTokenUS"
                }
            };
            Configuration.configure(config);
            const runner = new TestRunner();
            await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            
            expect(mockVirtualDevice.mock.calls[0][0]).toBe("alexaTokenUS");
            expect(mockVirtualDevice.mock.calls[0][1]).toBe("en-US");
        });

    });


    describe("control flow tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                invocationName: "space fact",
                locale: "en-US",
                type: CONSTANTS.TYPE.e2e,
                // eslint-disable-next-line spellcheck/spell-checker
                virtualDeviceToken: "space fact"
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

    describe("edge case tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                handler: "test/ExceptionSkill/index.handler",
                interactionModel: "test/ExceptionSkill/en-US.json",
                locale: "en-US"
            });
        });

        test("no response", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/ExceptionSkill/no-response-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
        });

        test("support only cardContent and prompt when platform is google", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                platform: CONSTANTS.PLATFORM.google,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact"
            });            
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-tests.common.yml");
            expect(results.length).toEqual(3);
            expect(results[1].interactionResults.length).toBe(2);
            expect(results[1].interactionResults[1].error).toBeUndefined();
        });

        test("ignore external errors", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                ignoreExternalErrors: true,
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact"
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
            expect(results[1].interactionResults[0].errorOnProcess).toBeDefined();
        });

        test("fail on external error", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact"
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
            expect(results[1].interactionResults[0].error).toBe("Error from virtual device");
            expect(results[1].interactionResults[0].errorOnProcess).toBeDefined();

            expect(results[2].skipped).toBe(false);
            expect(results[2].interactionResults.length).toBe(1);
            expect(results[2].interactionResults[0].error).toBe("Array, error");
            expect(results[2].interactionResults[0].errorOnProcess).toBeDefined();            
        });

        test("response with errors", async () => {
            Configuration.singleton = undefined;
            
            Configuration.configure({
                type: CONSTANTS.TYPE.e2e,
                virtualDeviceToken: "space fact"
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-with-error.yml");
            expect(results.length).toEqual(2);

            expect(results[0].skipped).toBe(false);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].error).toBeUndefined();
            
            expect(results[1].skipped).toBe(false);
            expect(results[1].interactionResults.length).toBe(2);
            expect(results[1].interactionResults[1].error).toBeDefined();
            expect(results[1].interactionResults[1].error).toBe("error message");
            expect(results[1].interactionResults[1].errorOnProcess).toBeDefined();       
        });
    });
});

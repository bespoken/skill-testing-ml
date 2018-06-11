const Configuration = require("../lib/runner/Configuration");
const TestRunner = require("../lib/runner/TestRunner");
const VirtualDeviceInvoker = require("../lib/runner/VirtualDeviceInvoker");
// eslint-disable-next-line 
const message = require("virtual-device-sdk").mockMessage;
// eslint-disable-next-line 
const addHomophones = require("virtual-device-sdk").mockAddHomophones;

describe("virtual device integration", () => {
    let _invoker;
    let _interaction;

    describe("interactions", async () => {

        beforeEach(() => {
            _invoker = new VirtualDeviceInvoker(undefined);
            _invoker.before({});
    
            _interaction = {
                test: {
                    testSuite: {
                        invocationName: "space fact"
                    }
                }
            };
            message.mockClear();
        });

        test("LaunchRequest", async () => {
            _interaction.utterance = "LaunchRequest";
    
            await _invoker.invoke(_interaction);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message).toHaveBeenCalledWith("open space fact");
        });
    
        test("AudioPlayer", async () => {
            _interaction.utterance = "AudioPlayer.";
    
            await _invoker.invoke(_interaction);
    
            expect(message).not.toHaveBeenCalled();
        });
    
        test("SessionEndedRequest", async () => {
            _interaction.utterance = "SessionEndedRequest";
    
            await _invoker.invoke(_interaction);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message).toHaveBeenCalledWith("exit");
        });
    
        test("First interaction is not a launch request", async () => {
            _interaction.utterance = "hi";
            _interaction.relativeIndex = 0;
    
            await _invoker.invoke(_interaction);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message).toHaveBeenCalledWith("ask space fact to hi");
        });
    
        test("Any utterance", async () => {
            _interaction.utterance = "test";
            _interaction.relativeIndex = 1;
    
            await _invoker.invoke(_interaction);
    
            expect(message).toHaveBeenCalledTimes(1);
            expect(message).toHaveBeenCalledWith("test");
        });

        test("homophones", async () => {
            _interaction.test.testSuite.homophones = {
                "lock": ["log"],
                "white": ["wide","wife"],
            };
            _interaction.utterance = "test";
    
            await _invoker.invoke(_interaction);

            expect(addHomophones).toHaveBeenCalledTimes(2);
            expect(addHomophones).toHaveBeenCalledWith("lock", ["log"]);
            expect(addHomophones).toHaveBeenCalledWith("white", ["wide","wife"]);
        });
    });

});

describe("virtual device runner", () => {
    describe("basic tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                invocationName: "space fact",
                invoker: "VirtualDeviceInvoker",
                locale: "en-US",
                // eslint-disable-next-line spellcheck/spell-checker
                virtualDeviceToken: "space fact"
            });
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
            expect(results[2].test.description).toEqual("Test 3");

        });
    });

    describe("control flow tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                invocationName: "space fact",
                invoker: "VirtualDeviceInvoker",
                locale: "en-US",
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

    describe("skip and only tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US"
            });
        });

        test("skip a test", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/skip-tests.yml");
            expect(results.length).toEqual(3);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].test.skip).toBe(false);
            expect(results[1].test.skip).toBe(true);
            expect(results[2].test.skip).toBe(false);
        });

        test("test file with only flags", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/only-tests.yml");
            expect(results.length).toEqual(4);
            expect(results[0].interactionResults.length).toBe(0);
            expect(results[0].test.skip).toBe(true);
            expect(results[1].test.skip).toBe(false);
            expect(results[1].test.only).toBe(true);
            expect(results[2].test.skip).toBe(false);
            expect(results[2].test.only).toBe(true);
            expect(results[3].test.skip).toBe(true);
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
    });
});

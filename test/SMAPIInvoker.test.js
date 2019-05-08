require("dotenv").config();
const Configuration = require("../lib/runner/Configuration");
const LoggingErrorHelper = require("../lib/util/LoggingErrorHelper");
const nock = require("nock");
const TestRunner = require("../lib/runner/TestRunner");
const Util = require("../lib/util/Util");

// Only run these tests when the SMAPI environment variable is set
const describeIf = process.env.SMAPI ? describe : describe.skip;
const describeMock = process.env.SMAPI ? describe.skip : describe;

let loggerSpy;

describeMock("SMAPI test with mock calls", () => {
    const getResult = () => ({
        skillExecutionInfo: {
            invocations: [{
                invocationResponse: {
                    body: {
                        response: {
                            outputSpeech: {
                                text: "Take a look at this image",
                            },
                        },
                    },
                },
            }],
        },
    });
    beforeAll(() => {
        // Create an ask config if it does not exist
        loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
        Util.createAskCliConfig();
    });    
    beforeEach(() => {
        Configuration.reset();
        nock.cleanAll();
        nock("https://api.amazonalexa.com")
            .post("/v2/skills/skillId/stages/live/simulations")
            .reply(200, {
                id: "simulationId",
            });
    });
    
    test("simple successful test", async () => {
        nock("https://api.amazonalexa.com")
            .get("/v2/skills/skillId/stages/live/simulations/simulationId")
            .reply(200, {
                id: "simulationId",
                result: getResult(),
                status: "SUCCESSFUL",
            });
        const runner = new TestRunner({
            locale: "en-US",
            skillId: "skillId",
            stage: "live",
            type: "simulation",
        });            
        const results = await runner.run("test/GuessTheGifSkill/simple.test.yml");
        expect(results.length).toEqual(1);
        expect(results[0].passed).toBe(true);
    });

    test("simple failed test", async () => {
        const result = {
            error: {
                message : "Skill is currently disabled in development stage.",
            },
        };
        nock("https://api.amazonalexa.com")
            .get("/v2/skills/skillId/stages/live/simulations/simulationId")
            .reply(200, {
                id: "simulationId",
                result: result,
                status: "FAILED",
            });
        const runner = new TestRunner({
            locale: "en-US",
            skillId: "skillId",
            stage: "live",
            type: "simulation",
        });            
        const results = await runner.run("test/GuessTheGifSkill/simple.test.yml");
        expect(results.length).toEqual(1);
        expect(results[0].passed).toBe(false);
        expect(results[0].interactionResults[0].error).toContain("Skill is currently disabled in development stage.");
    });    

    afterEach(() => {
        if(!nock.isDone()) {
            nock.cleanAll();
        }
    });
});

// See the note on SMAPI.test.js with regard to tests for SMAPI code
// These are separated from other tests because of their complex setup
describeIf("SMAPI Invoker Tests", () => {
    describe("various simulation scenarios", () => {
        beforeAll(() => {
            // Create an ask config if it does not exist
            Util.createAskCliConfig();
            loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});
            nock.cleanAll();
        });

        afterEach(() => {
            loggerSpy.mockRestore();
        });

        test("runs guess the gif skill test configured via ASK CLI", async () => {
            const runner = new TestRunner({
                locale: "en-US",
                skillId: process.env.ASK_SKILL_ID,
                stage: "development",
                type: "simulation",
            });
            const results = await runner.run("test/GuessTheGifSkill/index.test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].passed).toBe(true);
            expect(results[1].passed).toBe(false);
            expect(results[1].interactionResults[0].error).toContain("Expected value at [prompt] to ==");
        }, 60000);

        // This test requires having a VIRTUAL_DEVICE_TOKEN environment variable
        // It must be set to a value that has SMAPI permissions
        test.skip("runs guess the gif skill test configured via virtual device token", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            const runner = new TestRunner({
                locale: "en-US",
                skillId: process.env.ASK_SKILL_ID,
                stage: "live",
                type: "simulation",
                virtualDeviceToken: process.env.VIRTUAL_DEVICE_TOKEN,
            });
            const results = await runner.run("test/GuessTheGifSkill/simple.test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].passed).toBe(true);
        }, 20000);

        test.skip("exception when there is a bad virtual device token", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            expect.assertions(1);
            const runner = new TestRunner({
                locale: "en-US",
                skillId: process.env.ASK_SKILL_ID,
                stage: "live",
                type: "simulation",
                virtualDeviceToken: "nonsense",
            });

            try {
                await runner.run("test/GuessTheGifSkill/simple.test.yml");
            } catch (e) {
                expect(e.message).toContain("Invalid virtual device token");
            }
        }, 20000);

        test("exception when there is no skill ID", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            expect.assertions(1);
            const runner = new TestRunner({
                locale: "en-US",
                type: "simulation",
            });

            try {
                await runner.run("test/GuessTheGifSkill/index.test.yml");
            } catch (e) {
                expect(e.message).toContain("skillId must be specified");
            }
        }, 10000);

        test("exception when there is no stage", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            expect.assertions(1);
            const runner = new TestRunner({
                locale: "en-US",
                skillId: "SKILL_ID",
                type: "simulation",
            });

            try {
                await runner.run("test/GuessTheGifSkill/index.test.yml");
            } catch (e) {
                expect(e.message).toContain("stage must be set");
            }
        }, 10000);

        test("exception when stage is invalid", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            expect.assertions(1);
            const runner = new TestRunner({
                locale: "en-US",
                skillId: "SKILL_ID",
                stage: "invalid",
                type: "simulation",
            });

            try {
                await runner.run("test/GuessTheGifSkill/index.test.yml");
            } catch (e) {
                expect(e.message).toContain("Invalid value for stage");
            }
        }, 10000);
    });

});

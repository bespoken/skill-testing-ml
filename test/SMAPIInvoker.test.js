require("dotenv").config();
const Configuration = require("../lib/runner/Configuration");
const TestRunner = require("../lib/runner/TestRunner");

// Only run these tests when the SMAPI environment variable is set
const describeIf = process.env.SMAPI ? describe : describe.skip;

// See the note on SMAPI.test.js with regard to tests for SMAPI code
// These are separated from other tests because of their complex setup
describeIf("SMAPI Invoker Tests", () => {
    describe("various simulation scenarios", async () => {

        test("runs guess the gif skill test configured via ASK CLI", async () => {
            const runner = new TestRunner({
                locale: "en-US",
                skillId: process.env.ASK_SKILL_ID,
                type: "simulation"
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
                type: "simulation",
                virtualDeviceToken: process.env.VIRTUAL_DEVICE_TOKEN
            });
            const results = await runner.run("test/GuessTheGifSkill/simple.test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].passed).toBe(true);
        }, 20000);

        test("exception when there is a bad virtual device token", async () => {
            // We need to make sure to reset the configuration before running this test
            Configuration.reset();
            expect.assertions(1);
            const runner = new TestRunner({
                locale: "en-US",
                skillId: process.env.ASK_SKILL_ID,
                type: "simulation",
                virtualDeviceToken: "nonsense"
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
                type: "simulation"
            });

            try {
                await runner.run("test/GuessTheGifSkill/index.test.yml");
            } catch (e) {
                expect(e.message).toContain("skillId must be specified");
            }
        }, 10000);
    });

});

require("dotenv").config();
const TestRunner = require("../lib/runner/TestRunner");
// We only run tests if the ASK_ACCESS_TOKEN variable is set
const describeIf = process.env.SMAPI ? describe : describe.skip;

describeIf("SMAPI Invoker Tests", () => {
    describe("various simulation scenarios", async () => {

        test("runs guess the gif skill test", async () => {
            const runner = new TestRunner({
                locale: "en-US",
                /* eslint-disable-next-line spellcheck/spell-checker */
                skillId: "amzn1.ask.skill.2d19cb76-c064-4cf3-8eed-bad3bc9444e5",
                type: "simulation"
            });
            const results = await runner.run("test/GuessTheGifSkill/index.test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].passed).toBe(true);
            expect(results[1].passed).toBe(false);
            expect(results[1].interactionResults[0].error).toContain("Expected value at [prompt] to ==");
        }, 60000);

        test("exception when there is no skill ID", async () => {
            // We need to make sure to reset the configuration before running this test
            require("../lib/runner/Configuration").singleton = undefined;
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

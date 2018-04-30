const VirtualAlexaRunner = require("../lib/VirtualAlexaRunner");

describe("virtual alexa runner", () => {
    test("runs fact skill test", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/FactSkill/index.handler",
            interactionModelFile: "test/FactSkill/models/en-US.json"
        })
        const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(results.length).toEqual(2);
    });

    test("error on no locale", async () => {
        const runner = new VirtualAlexaRunner()
        const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(results.length).toEqual(2);
    });
});

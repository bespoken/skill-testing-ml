const TestSuite = require("../lib/TestSuite");
const VirtualAlexaRunner = require("../lib/VirtualAlexaRunner");

describe("virtual alexa runner", () => {
    test("runs fact skill test", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/FactSkill/index.handler",
            interactionModelFile: "test/FactSkill/models/en-US.json"
        });
        const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(results.length).toEqual(2);
    });

    test("uses global locale", async () => {
        const runner = new VirtualAlexaRunner({
            interactionModelFile: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        const suite = new TestSuite("fileName", {}, []);
        await runner.runSuite(suite);
    });

    test("error on no locale", async () => {
        const runner = new VirtualAlexaRunner({});
        const suite = new TestSuite("fileName", {}, []);

        expect(() => {
            runner.runSuite(suite);
        }).toThrow("Locale must be defined either in the skill-config.json or the test file itself under the config element");
    });
});

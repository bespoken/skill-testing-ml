const TestSuite = require("../lib/TestSuite");
const VirtualAlexaRunner = require("../lib/VirtualAlexaRunner");

describe("virtual alexa runner", () => {
    test("runs fact skill test", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json"
        });
        const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
        expect(results.length).toEqual(3);
        expect(results[0].test.description).toEqual("Launches successfully");
        expect(results[0].interactionResults[0].interaction.utterance).toEqual("Hi");
        expect(results[2].test.description).toEqual("Test 3");
    });

    test("uses global locale", async () => {
        const runner = new VirtualAlexaRunner({
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        const suite = new TestSuite("fileName", {}, []);
        await runner.runSuite(suite);
    });

    test("explicit intent and slots", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        await runner.run("test/TestFiles/explicit-intent-tests.yml");
    });

    test("set expressions", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        await runner.run("test/TestFiles/expressions-tests.yml");
    });

    test("error on no locale", async () => {
        const runner = new VirtualAlexaRunner({});
        const suite = new TestSuite("fileName", {}, []);

        try {
            await runner.runSuite(suite);
        } catch (e) {
            expect(e.message).toEqual("Locale must be defined either in the skill-config.json or the test file itself under the config element");
        }
    });

    test("Test Address API with full address", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/AddressSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        const results = await runner.run("test/AddressSkill/full-address-test.yml");
        expect(results.length).toEqual(2);
        expect(results[0].interactionResults[0].error).toBeDefined();
        expect(results[1].interactionResults[0].error).toBeUndefined();
    });

    test("Test Address API with postal and country code", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/AddressSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        const results = await runner.run("test/AddressSkill/short-address-test.yml");
        expect(results.length).toEqual(1);
        expect(results[0].interactionResults[0].error).toBeUndefined();
    });

    test("Test Address API with insufficient permissions", async () => {
        const runner = new VirtualAlexaRunner({
            handler: "test/AddressSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });

        const results = await runner.run("test/AddressSkill/no-address-test.yml");
        expect(results.length).toEqual(1);
        expect(results[0].interactionResults[0].error).toBeUndefined();
    });
});

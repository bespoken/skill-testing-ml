const Configuration = require("../lib/runner/Configuration");
const TestRunner = require("../lib/runner/TestRunner");

describe("virtual google assistant runner", () => {
    describe("basic tests", () => {
        beforeEach(() => {
            Configuration.configure({
                directory: "test/SillyNameMakerExpress/dialogFlow",
                expressModule: "test/SillyNameMakerExpress/index",
                expressPort: 3000,
                invoker: "VirtualGoogleAssistantInvoker",
                locale: "en-US"
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs silly name maker action test", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/SillyNameMakerExpress/silly-name-maker-tests.yml");
            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("Complex tests", () => {
        beforeEach(() => {
            Configuration.configure({
                directory: "test/FactsAboutGoogle/dialogFlow",
                expressModule: "test/FactsAboutGoogle/index",
                expressPort: 3000,
                invoker: "VirtualGoogleAssistantInvoker",
                locale: "en-US"
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs fact skill test", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/FactsAboutGoogle/facts-about-google-tests.yml");
            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].error).toBeUndefined();
        }, 10000);
    });
});

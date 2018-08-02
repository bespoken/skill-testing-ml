const Configuration = require("../lib/runner/Configuration");
const CONSTANTS = require("../lib/util/Constants");
const TestRunner = require("../lib/runner/TestRunner");

describe("virtual google assistant runner", () => {
    describe("basic tests", () => {
        beforeEach(() => {
            Configuration.configure({
                dialogFlowDirectory: "test/SillyNameMakerExpress/dialogFlow",
                expressModule: "test/SillyNameMakerExpress/index",
                expressPort: 3000,
                locale: "en-US",
                platform: CONSTANTS.PLATFORM.google,
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs silly name maker action test failing assertion", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/SillyNameMakerExpress/silly-name-maker-tests-with-errors.yml");

            expect(results.length).toEqual(1);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].error).toContain("Expected value at [prompt]");
            expect(results[0].interactionResults[0].error).toContain("*Alright, your name is.*");
            expect(results[0].interactionResults[0].error).toContain("Alright, your silly name is ");
        });
    });

    describe("basic tests with errors", () => {
        beforeEach(() => {
            Configuration.configure({
                dialogFlowDirectory: "test/SillyNameMakerExpress/dialogFlow",
                expressModule: "test/SillyNameMakerExpress/index",
                expressPort: 3000,
                locale: "en-US",
                platform: CONSTANTS.PLATFORM.google,
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
                dialogFlowDirectory: "test/FactsAboutGoogle/dialogFlow",
                expressModule: "test/FactsAboutGoogle/index",
                expressPort: 3000,
                locale: "en-US",
                platform: CONSTANTS.PLATFORM.google
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

    describe("Error tests", () => {
        beforeEach(() => {

        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("missing configuration test (errors should bubble up from virtual google)", async () => {
            Configuration.configure({
                dialogFlowDirectory: "test/FactsAboutGoogle/dialogFlow",
                expressModule: "test/FactsAboutGoogle/index",
                locale: "en-US",
                platform: CONSTANTS.PLATFORM.google
            });
            const runner = new TestRunner();

            try {
                await runner.run("test/FactsAboutGoogle/facts-about-google-tests.yml");
                throw new Error("We should not reach here");
            } catch (error) {
                expect(error.message).toEqual("Port required when using express handler");
            }

        });

        test("Internal code throws an exception", async () => {
            Configuration.configure({
                dialogFlowDirectory: "test/FactsAboutGoogle/dialogFlow",
                expressModule: "test/FactsAboutGoogle/index",
                expressPort: 3000,
                locale: "en-US",
                platform: CONSTANTS.PLATFORM.google
            });
            const runner = new TestRunner();

            const results = await runner.run("test/FactsAboutGoogle/facts-about-google-tests-provoke-error.yml");
            expect(results.length).toEqual(2);

            expect(results[0].test.description).toEqual("Throws an exception mid test");
            expect(results[0].interactionResults[1].error).toEqual("Invalid response: 500 Message: Internal Server Error");
            expect(results[0].interactionResults[2].error).toBeUndefined();
        });
    });
});
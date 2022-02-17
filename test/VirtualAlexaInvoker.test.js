const Configuration = require("../lib/runner/Configuration");
const LoggingErrorHelper = require("../lib/util/LoggingErrorHelper");
const TestRunner = require("../lib/runner/TestRunner");
const TestSuite = require("../lib/test/TestSuite");

describe("virtual alexa runner", () => {
    describe("basic tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("runs fact skill test", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("Hi");
            expect(results[0].interactionResults[1].error).toBeUndefined();
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[2].test.description).toEqual("Test 3");
        });

        test("runs fact skill test using intentSchema and sampleUtterances", async () => {
            Configuration.singleton = undefined;
            Configuration.configure({
                handler: "test/FactSkill/index.handler",
                intentSchema: "test/FactSkill/models/intentSchema.json",
                locale: "en-US",
                sampleUtterances: "test/FactSkill/models/sampleUtterances.txt",
            });
            const runner = new TestRunner();
            const results = await runner.run("test/FactSkill/fact-skill-tests.yml");
            expect(results.length).toEqual(3);
            expect(results[0].test.description).toEqual("Launches successfully");
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("Hi");
            expect(results[0].interactionResults[1].error).toBeUndefined();
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[2].test.description).toEqual("Test 3");
        });

        test("uses global locale", async () => {
            Configuration.singleton = undefined;
            Configuration.configure({
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });

            const runner = new TestRunner();
            const suite = new TestSuite("fileName", {}, []);
            await runner.runSuite(suite);
        });

        test("explicit intent and slots", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/TestFiles/explicit-intent-tests.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("This name means nothing");
            expect(results[0].interactionResults[0].interaction.slots._yaml).toBeUndefined();
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("interactionError on no locale", async () => {
            Configuration.singleton = undefined;
            Configuration.configure({});
            const runner = new TestRunner();
            const suite = new TestSuite("fileName", {}, []);

            try {
                await runner.runSuite(suite);
                throw "This should never be reached";
            } catch (e) {
                expect(e.message).toEqual("Locale must be defined either in the testing.json or the test file itself under the config element");
            }
        });
    });

    describe("expression tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                handler: "test/ExpressionSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("set expressions", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/ExpressionSkill/expressions-tests.yml");
            // The index handler throws exceptions if values are not set correctly
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("call full address api tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                handler: "test/AddressSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("Test Address API with full address", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/full-address-test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults[0].error).toBeDefined();
            expect(results[0].interactionResults[0].error).toContain("at test/AddressSkill/full-address-test.yml:17:0");
            expect(results[1].interactionResults[0].error).toBeUndefined();
        });

        test("Test Address API with postal and country code", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/short-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeDefined();
        });

        test("Test Address API with insufficient permissions", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/no-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("Test Address API with null field", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/null-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("call partial address api tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                handler: "test/AddressSkill/postal-only-index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("Test Address API with full address", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/full-address-test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults[0].error).toBeDefined();
            expect(results[1].interactionResults[0].error).toBeDefined();
        });

        test("Test Address API with postal and country code", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/short-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("Test Address API with insufficient permissions", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/no-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("Test Address API with null field", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/AddressSkill/null-address-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("call user profile api tests", () => {
        beforeEach(() => {
            return Configuration.configure({
                handler: "test/UserProfileSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("Test User Profile API with different calls", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/UserProfileSkill/full-user-profile-test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults[0].error).toBeDefined();
            expect(results[0].interactionResults[0].error)
                .toContain("James Tiberius Kirk");
            expect(results[0].interactionResults[0].error)
                .toContain("at test/UserProfileSkill/full-user-profile-test.yml:16");
            expect(results[1].interactionResults[0].error).toBeUndefined();
        });

        test("Test User Profile API with 403", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/UserProfileSkill/missing-name-profile-test.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults[0].error).toBeDefined();

            expect(results[0].interactionResults[0].error)
                .toContain("undefined");
            expect(results[0].interactionResults[0].error)
                .toContain("at test/UserProfileSkill/missing-name-profile-test.yml:15:0");
            expect(results[1].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("filter tests", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("filter is applied to request and response", async () => {
            Configuration.configure({
                accessToken: "testToken",
                context: ".",
                filter: "test/FilterSkill/filter",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/FilterSkill/filter-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("filter is applied to request and response", async () => {
            Configuration.configure({
                accessToken: "testToken",
                context: ".",
                filter: "test/FilterSkill/filter-typo",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/FilterSkill/filter-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeDefined();
        });
    });

    describe("control flow tests", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
            return Configuration.configure({
                context: ".",
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        test("Test goto", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/control-flow-tests.yml");
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

        test("Test goto label", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/control-flow-tests.label.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[0].passed).toBe(true);
            expect(results[0].interactionResults[0].goto).toBe("GetNew");
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].interaction.utterance).toBe("Get New Fact");
            expect(results[0].interactionResults[1].passed).toBe(false);

            // Check on exit
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].passed).toBe(true);
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[1].interactionResults[0].exited).toBe(true);
        });

        test("Test goto label no assertion", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/control-flow-tests.label-no-assert.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].passed).toBe(true);
            expect(results[0].interactionResults[0].error).toBeUndefined();

            // Check on exit
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].passed).toBe(true);
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[1].interactionResults[0].exited).toBe(true);
        });
    });

    describe("shorthand property tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        test("Test shorthand properties", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/shorthand-tests.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(1);
            expect(results[0].interactionResults[0].passed).toBe(true);
            expect(results[0].interactionResults[0].error).toBeUndefined();

            // Check on help
            expect(results[1].interactionResults.length).toBe(1);
            expect(results[1].interactionResults[0].passed).toBe(true);
            expect(results[1].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("skip and only tests", () => {
        beforeAll(() => {
            return Configuration.configure({
                handler: "test/FactSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        // TODO fix test
        xtest("skip a test", async () => {
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
                locale: "en-US",
            });
        });

        test("no response", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/ExceptionSkill/no-response-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults.length).toBe(1);
        });

        test("no intent match", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/ExceptionSkill/no-intent-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toContain("Interaction model has no intentName named: NonExistentIntent");
        });

        test("no utterance match", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/ExceptionSkill/no-utterance-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toContain("Unable to match utterance: Hi to an intent.");
        });

        test("when interaction model is not set, look for model/en-US.json", async () => {
            Configuration.singleton = undefined;
            Configuration.configure({
                configurationPath: "test/ExceptionSkill/testing.json",
                handler: "test/ExceptionSkill/index.handler",
                locale: "en-US",
            });

            const loggerSpy = jest.spyOn(LoggingErrorHelper, "error").mockImplementation(() => {});

            try {
                const runner = new TestRunner();
                await runner.run("test/ExceptionSkill/no-utterance-test.yml");
            } catch (error) {
                expect(error.message).toContain("models");
                expect(error.message).toContain("en-US.json");
                expect(loggerSpy).toHaveBeenCalledTimes(2);
            }
        });
    });

    describe("locales", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        afterEach(() => {
            
        });

        test("run all locales, localized slot values", async () => {
            process.chdir("test/PetMatchSkill");
            const getSlotSize = (locale) => {
                let value = "";
                switch (locale) {
                // eslint-disable-next-line spellcheck/spell-checker
                case "de-DE":
                    value = "miniature";
                    break;
                case "en-GB":
                    value = "tiddly";
                    break;
                case "en-US":
                    value = "mini";
                    break;
                case "es-ES":
                    // eslint-disable-next-line spellcheck/spell-checker
                    value = "minúsculo";
                    break;
                }
                return { size: value };
            };

            const runner = new TestRunner({ configurationPath: "./testing.json"});
            const results = await runner.run("multiLocale.externalized.yml");

            expect(results.length).toEqual(4);
            expect(results[0].interactionResults[1].interaction.localizedSlots).toEqual(getSlotSize(results[0].locale));
            expect(results[1].interactionResults[1].interaction.localizedSlots).toEqual(getSlotSize(results[1].locale));
            expect(results[2].interactionResults[1].interaction.localizedSlots).toEqual(getSlotSize(results[2].locale));
            expect(results[3].interactionResults[1].interaction.localizedSlots).toEqual(getSlotSize(results[3].locale));
            process.chdir("../..");
        });

        test("localization files", async () => {
            process.chdir("test/MultiLocaleFactSkill");

            const runner = new TestRunner({ configurationPath: "./testing.json"});
            const results = await runner.run("multi-locale-fact-skill-test.yml");
            expect(results.length).toEqual(4);

            expect(results[0].test.description).toEqual("Multi locale skill");
            expect(results[0].interactionResults[0].interaction.utterance).toEqual("LaunchRequest");
            expect(results[0].interactionResults[0].error).toBeUndefined();
            expect(results[0].interactionResults[1].interaction.utterance).toEqual("GetNewFactIntent");
            expect(results[0].interactionResults[1].error).toBeUndefined();

            expect(results[1].test.description).toEqual("Multi locale skill");
            expect(results[1].interactionResults[0].interaction.utterance).toEqual("LaunchRequest");
            expect(results[1].interactionResults[0].error).toBeUndefined();
            expect(results[1].interactionResults[1].interaction.utterance).toEqual("GetNewFactIntent");
            expect(results[1].interactionResults[1].error).toBeUndefined();

            expect(results[2].test.description).toEqual("Multi locale skill");
            expect(results[2].interactionResults[0].interaction.utterance).toEqual("LaunchRequest");
            expect(results[2].interactionResults[0].error).toBeUndefined();
            expect(results[2].interactionResults[1].interaction.utterance).toEqual("GetNewFactIntent");
            expect(results[2].interactionResults[1].error).toBeUndefined();

            expect(results[3].test.description).toEqual("Multi locale skill");
            expect(results[3].interactionResults[0].interaction.utterance).toEqual("LaunchRequest");
            expect(results[3].interactionResults[0].error).toBeUndefined();
            expect(results[3].interactionResults[1].interaction.utterance).toEqual("GetNewFactIntent");
            expect(results[3].interactionResults[1].error).toBeUndefined();
            process.chdir("../..");
        });
    });

    describe("supportedInterfaces", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("VideoApp", async () => {
            Configuration.configure({
                context: ".",
                deviceId: "device",
                filter: "test/FilterSkill/filter",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
                supportedInterfaces: "VideoApp",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/interfaces-videoApp-supported-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("Display and VideoApp", async () => {
            Configuration.configure({
                context: ".",
                filter: "test/FilterSkill/filter",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
                supportedInterfaces: "Display, VideoApp",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/interfaces-display-and-videoApp-supported-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });

        test("all interfaces", async () => {
            Configuration.configure({
                context: ".",
                filter: "test/FilterSkill/filter",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/interfaces-all-supported-test.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("deviceId and userId", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("send deviceId and userId to virtual alexa", async () => {
            Configuration.configure({
                deviceId: "MyDeviceId",
                filter: "test/FilterSkill/filter",
                handler: "test/FilterSkill/index.handler",
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
                userId: "MyUserId",
            });

            const runner = new TestRunner();

            const results = await runner.run("test/TestFiles/deviceId-userId.yml");
            expect(results.length).toEqual(1);
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("skillURL", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
            return Configuration.configure({
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
                skillURL: "https://httpbin.org/post",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("valid url", async () => {
            const runner = new TestRunner();
            const results = await runner.run("test/ExpressionSkill/skillURL-tests.yml");
            expect(results[0].interactionResults[0].error).toBeUndefined();
        });
    });

    describe("ignore properties on demand", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
            return Configuration.configure({
                handler: "test/FactSkill/index.handler",
                ignoreProperties: {
                    alexa: {
                        paths: "streamURL, display.array[0].url",
                        type: "unit",
                    },
                },
                interactionModel: "test/FactSkill/models/en-US.json",
                locale: "en-US",
            });
        });

        afterEach(() => {
            Configuration.singleton = undefined;
        });

        test("ignore streamURL", async () => {
            const runner = new TestRunner();

            const results = await runner.run("test/FactSkill/fact-skill-ignore-props.yml");
            expect(results.length).toEqual(2);
            expect(results[0].interactionResults.length).toBe(2);
            expect(results[0].interactionResults[1].error).toBeUndefined();
        });
    });
});

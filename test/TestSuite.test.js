const Configuration = require("../lib/runner/Configuration");
const path = require("path");
const TestSuite = require("../lib/test/TestSuite");

describe("test suite", () => {
    beforeEach(() => {
        Configuration.singleton = undefined;
    });

    describe("supportedInterfaces", () => {
        test("only videoAppSupported", async () => {
            Configuration.configure({
                supportedInterfaces: "VideoApp",
            });
    
            const testSuite = new TestSuite();
            const { audioPlayerSupported, displaySupported, videoAppSupported } = testSuite.supportedInterfaces;
            expect(audioPlayerSupported).toBe(false);
            expect(displaySupported).toBe(false);
            expect(videoAppSupported).toBe(true);
        });

        test("audioPlayerSupported and displaySupported", async () => {
            Configuration.configure({
                supportedInterfaces: "AudioPlayer, Display",
            });
    
            const testSuite = new TestSuite();
            const { audioPlayerSupported, displaySupported, videoAppSupported } = testSuite.supportedInterfaces;
            expect(audioPlayerSupported).toBe(true);
            expect(displaySupported).toBe(true);
            expect(videoAppSupported).toBe(false);
        });

        
        test("all supported", async () => {
            Configuration.configure({});
    
            const testSuite = new TestSuite();
            const { audioPlayerSupported, displaySupported, videoAppSupported } = testSuite.supportedInterfaces;
            expect(audioPlayerSupported).toBe(true);
            expect(displaySupported).toBe(true);
            expect(videoAppSupported).toBe(true);
        });
    });

    describe("loadLocalizedValues", () => {
        test("same path", async () => {
            Configuration.configure({});
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            await testSuite.loadLocalizedValues();
            expect(testSuite.localizedValues.en.test).toBe("This file is on locales/en.yml");
        });

        test("path over", async () => {
            Configuration.configure({});
    
            const testSuite = new TestSuite("test/TestFiles/unit/dummy-test.yml");
            await testSuite.loadLocalizedValues();
            expect(testSuite.localizedValues.en.test).toBe("This file is on locales/en.yml");
        });
    });

    describe("interactionModel", () => {
        test("defaultValue", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                locale: "en-GB",
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(testSuite.interactionModel).toBe(
                path.normalize(path.join(process.cwd(), "test/TestFiles/models/en-GB.json"))
            );
        });

        test("relative path", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                interactionModel: "./models/en-GB.json",
                locale: "en-GB",
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(testSuite.interactionModel).toBe(
                path.normalize(path.join(process.cwd(), "test/TestFiles/models/en-GB.json"))
            );
        });
    });

    describe("handler", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
            process.chdir("test/TestFiles");
        });
    
        afterEach(() => {
            process.chdir("../..");
        });  

        test("defaultValue", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(testSuite.handler).toBe(
                path.join(process.cwd(), "./test/TestFiles/index.handler"));
        });

        test("custom handler", async () => {
            const testCases = [
                {
                    configurationPath: "testing.json",
                    description: "relative configuration, relative handler",
                    expected: path.join(process.cwd(), "./../FactSkill/index.handler"),
                    handler: "./../FactSkill/index.handler",
                },
                {
                    configurationPath: path.join(process.cwd(), "testing.json"),
                    description: "absolute configuration, relative handler",
                    expected: path.join(process.cwd(), "./../FactSkill/index.handler"),
                    handler: "./../FactSkill/index.handler",
                },
                {
                    configurationPath: path.join(process.cwd(), "testing.json"),
                    context: "./..",
                    description: "relative context, relative handler",
                    expected: path.join(process.cwd(), "./../FactSkill/index.handler"),
                    handler: "./FactSkill/index.handler",
                },
            ];
            testCases.forEach((testCase) => {
                Configuration.singleton = undefined;
                Configuration.configure({
                    configurationPath: testCase.configurationPath,
                    context: testCase.context,
                    handler: testCase.handler,
                });

                const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
                expect(testSuite.handler).toBe(testCase.expected, testCase.description);
            });
        });


    });

    describe("filter", () => {
        test("relative path", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                filter: "../Filters/testFilter.js",
            });

            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");

            expect(testSuite.filterObject().onRequest).toBeDefined();
        });
    });

    describe("stage", () => {
        test("get", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                filter: "../Filters/testFilter.js",                
                stage: "live",
            });

            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            expect(testSuite.stage).toBe("live");
        });
    });
});
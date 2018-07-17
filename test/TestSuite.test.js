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
                supportedInterfaces: "VideoApp"
            });
    
            const testSuite = new TestSuite();
            const { audioPlayerSupported, displaySupported, videoAppSupported } = testSuite.supportedInterfaces;
            expect(audioPlayerSupported).toBe(false);
            expect(displaySupported).toBe(false);
            expect(videoAppSupported).toBe(true);
        });

        test("audioPlayerSupported and displaySupported", async () => {
            Configuration.configure({
                supportedInterfaces: "AudioPlayer, Display"
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
                locale: "en-GB"
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(path.normalize(testSuite.interactionModel)).toBe("models/en-GB.json");
        });

        test("path relative", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                interactionModel: "../models/en-GB.json",
                locale: "en-GB"
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(path.normalize(testSuite.interactionModel)).toBe("test/models/en-GB.json");
        });
    });

    describe("handler", () => {
        test("defaultValue", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(testSuite.handler).toBe("index.handler");
        });

        test("path relative", async () => {
            Configuration.configure({
                configurationPath: "test/TestFiles/testing.json",
                handler: "../index.handler",
            });
    
            const testSuite = new TestSuite("test/TestFiles/simple-tests.yml");
            
            expect(path.normalize(testSuite.handler)).toBe("test/index.handler");
        });
    });
});
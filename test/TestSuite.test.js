const Configuration = require("../lib/runner/Configuration");
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
});
const Configuration = require("../lib/runner/Configuration");
const ConfigurationKeys = require("../lib/runner/ConfigurationKeys");
const path = require("path");

describe("configuration", () => {
    beforeEach(() => {
        Configuration.singleton = undefined;
    });

    test("override configuration with env variables", async () => {
        process.env["jest.collectCoverage"] = false;
        await Configuration.configure();
        const jestConfiguration = Configuration.instance().value("jest");
        expect(jestConfiguration.collectCoverage).toBe(false);
    });

    test("override configuration with cli", async () => {
        const cliOverrides = {
            "jest.collectCoverage": "false"
        };
        await Configuration.configure({}, "", cliOverrides);
        const jestConfiguration = Configuration.instance().value("jest");
        expect(jestConfiguration.collectCoverage).toBe(false);
    });

    describe("test path", function () {
        test("testing.json same folder of test file", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/e2e");
            let virtualDeviceToken = Configuration.instance().value("virtualDeviceToken");
            expect(virtualDeviceToken).toBe("tokenFromE2e");

            Configuration.singleton = undefined;
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/e2e/en-US");
            virtualDeviceToken = Configuration.instance().value("virtualDeviceToken");
            expect(virtualDeviceToken).toBe("tokenFromEnUs");
        });

        test("testing.json missing", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/e2e/en-GB");
            const virtualDeviceToken = Configuration.instance().value("virtualDeviceToken");
            expect(virtualDeviceToken).toBeUndefined();
        });
    });

    describe("jest.coverageDirectory ", function () {

        test("when testing.json exists", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/unit");
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe(path.normalize("test/ConfigurationTestFiles/test/unit/coverage/"));
        });
    
        test("when testing.json is missing", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/e2e/en-GB");
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe(path.normalize("test/coverage/"));
        });

        test("when testing.json overrides coverageDirectory", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/overrideCoverage");
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe("customFolder/coverage/");
        });

        test("when testing.json is on the root folder", async () => {
            process.chdir("test/FactSkill")
            await Configuration.configure(undefined, ".");
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe(path.normalize("coverage/"));
            process.chdir("../..");
        });
    });

    describe("ConfigurationKeys", () =>{
        const keys = [
            "voiceId",
            "accessToken",
            "deviceId",
            "platform",
            "type",
            "locales",
            "locale",
            "trace",
            "virtualDeviceToken",
            "jest.collectCoverage",
            "jest.collectCoverageFrom",
            "jest.coverageDirectory",
            "jest.moduleFileExtensions",
            "jest.silent",
            "jest.testMatch",
            "jest.testPathIgnorePatterns",
            "jest.verbose",
        ];

        keys.forEach(key => {
            const match = ConfigurationKeys.find(item => item.key === key);
            expect(match).toBeDefined();
            expect(match.key).toBeDefined();
            expect(match.text).toBeDefined();
        });
    });

});
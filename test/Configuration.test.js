const Configuration = require("../lib/runner/Configuration");
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
            let jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe(path.normalize("test/ConfigurationTestFiles/test/unit/coverage/"));
        });
    
        test("when testing.json is missing", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/e2e/en-GB");
            let jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe(path.normalize("test/coverage/"));
        });

        test("when testing.json overrides coverageDirectory", async () => {
            await Configuration.configure(undefined, "test/ConfigurationTestFiles/test/overrideCoverage");
            let jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe("customFolder/coverage/");
        });
    });

});
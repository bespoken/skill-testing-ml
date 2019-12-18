const Configuration = require("../lib/runner/Configuration");
const ConfigurationKeys = require("../lib/runner/ConfigurationKeys");
const path = require("path");

describe("configuration", () => {
    beforeEach(() => {
        Configuration.singleton = undefined;
        process.chdir("test/ConfigurationTestFiles");
    });

    afterEach(() => {
        process.chdir("../..");
    });    

    test("override configuration with env variables", async () => {
        process.env["jest.collectCoverage"] = false;
        await Configuration.configure();
        const jestConfiguration = Configuration.instance().value("jest");
        expect(jestConfiguration.collectCoverage).toBe(false);
    });

    test("override configuration with cli", async () => {
        const cliOverrides = {
            "jest.collectCoverage": "false",
        };
        await Configuration.configure({}, "", cliOverrides);
        const jestConfiguration = Configuration.instance().value("jest");
        expect(jestConfiguration.collectCoverage).toBe(false);
    });

    test("override configuration with internal variables", () => {
        const testingJson = `{
              "type": "e2e",
              "asyncMode": true,
              "findReplace": {
                  "INVOCATION_NAME": "$\{myEnvVariable}"
              },
              "homophones": {
                  "bring": [ "$\{env1}", "$\{env2}", "$\{env1}"],
              }
          }`;

        const expectedJson = `{
              "type": "e2e",
              "asyncMode": true,
              "findReplace": {
                  "INVOCATION_NAME": "my Invocation Name"
              },
              "homophones": {
                  "bring": [ "brick", "ring", "brick"],
              }
          }`;

        process.env.myEnvVariable = "my Invocation Name";
        process.env.env1 = "brick";
        process.env.env2 = "ring";

        const convertedJson = Configuration.replaceVariablesInsideTestingJson(testingJson);
        expect(convertedJson).toBe(expectedJson);

    });


    describe("override configuration write a skill testing file", () => {
        test("generate file", async () => {
            const cliOverrides = {
                "jest.collectCoverage": "false",
            };
            await Configuration.configure({}, "", cliOverrides, true);
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.collectCoverage).toBe(false);
        });
    });

    describe("Reporter jest property is setup correctly", () => {
        beforeEach(() => {
            Configuration.singleton = undefined;
        });

        test("no reporters present", async () => {
            await Configuration.configure({}, "", null, true);
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.reporters.length).toBe(2);
            expect(jestConfiguration.reporters[0]).toEqual("default");
            expect(jestConfiguration.reporters[1]).toContain(path.normalize("jest-stare"));
        });

        test("reporters present in configuration (console)", async () => {
            await Configuration.configure({
                html: false,
            }, "", null, true);
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.reporters).toEqual(["default"]);
        });


        test("reporters present in configuration (html)", async () => {
            await Configuration.configure({
                html: true,
            }, "", null, true);
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.reporters.length).toEqual(2);
        });

        test("reporters present in jest configuration", async () => {
            await Configuration.configure({
                jest: {
                    reporters: ["jest-silent-reporter"],
                },
            }, "", null, true);
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.reporters.length).toEqual(1);
            expect(jestConfiguration.reporters).toEqual(["jest-silent-reporter"]);

        });
    });

    describe("configuration path", function () {
        test("testing.json same folder of test file", async () => {
            await Configuration.configure(undefined, "", { config: "test/e2e/testing.json"});
            let virtualDeviceToken = Configuration.instance().value("virtualDeviceToken");
            expect(virtualDeviceToken).toBe("tokenFromE2e");

            Configuration.singleton = undefined;
            await Configuration.configure(undefined, "", { config: "test/e2e/en-US/testing.json"});
            virtualDeviceToken = Configuration.instance().value("virtualDeviceToken");
            expect(virtualDeviceToken).toBe("tokenFromEnUs");
        });

        test("testing.json missing", async () => {
            try {
                await Configuration.configure(undefined, "", { config:"test/e2e/en-GB/testing.json"});
                expect(true).toBe(false);
            } catch (error) {
                expect(true).toBe(true);
            } 
        });
    });

    describe("jest.coverageDirectory ", function () {

        test("when testing.json exists", async () => {
            await Configuration.configure(undefined, "", { config: "test/unit/testing.json"});
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toContain(path.normalize("test_output/coverage"));
        });
    
        test("when testing.json is missing", async () => {
            await Configuration.configure(undefined, "", { config: "test/e2e/en-GB/testing.json"});
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toContain(path.normalize("test_output/coverage"));
        });

        test("when testing.json overrides coverageDirectory", async () => {
            await Configuration.configure(undefined, "", { config: "test/overrideCoverage/testing.json"});
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toBe("customFolder/coverage/");
        });

        test("when testing.json is on the root folder", async () => {
            await Configuration.configure(undefined, "");
            const jestConfiguration = Configuration.instance().value("jest");
            expect(jestConfiguration.coverageDirectory).toContain(path.normalize("test_output/coverage"));
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
            "reporters",
            "runInBand",
            "include",
            "exclude",
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

        keys.forEach((key) => {
            const match = ConfigurationKeys.find(item => item.key === key);
            expect(match).toBeDefined();
            expect(match.key).toBeDefined();
            expect(match.text).toBeDefined();
        });
    });

});
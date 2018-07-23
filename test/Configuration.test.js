const Configuration = require("../lib/runner/Configuration");

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
});
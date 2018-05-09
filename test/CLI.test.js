// Best we can do with testing this is to mock jest and the call to runCLI
const mockRunCLI = jest.fn();
jest.mock("jest", () => {
    return {
        runCLI: mockRunCLI,
    };
});

const CLI = require("../lib/CLI");

describe("CLI", () => {
    beforeEach(() => {
        process.chdir("test/FactSkill");
    });

    afterEach(() => {
        process.chdir("../..");
    });

    test("cli runs", async () => {
        const cli = new CLI();
        await cli.run();
        expect(mockRunCLI).toHaveBeenCalledTimes(1);
        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();

        // We pass the config to Jest as a string of JSON - so we need to convert it back to JSON
        const config = JSON.parse(configString);
        expect(config.collectCoverage).toBe(true);
    });
});
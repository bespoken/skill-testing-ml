// Best we can do with testing this is to mock jest and the call to runCLI
const mockRunCLI = jest.fn(() => {
    return Promise.resolve({ results: { success: true } });
});

jest.mock("jest", () => {
    return {
        runCLI: mockRunCLI,
    };
});

const CLI = require("../lib/CLI");

describe("CLI", () => {
    beforeEach(() => {
        mockRunCLI.mockClear();
        process.chdir("test/FactSkill");
    });

    afterEach(() => {
        process.chdir("../..");
    });

    test("cli runs", async () => {
        const cli = new CLI();
        const success = await cli.run([]);
        expect(success).toBe(true);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);
        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();

        // We pass the config to Jest as a string of JSON - so we need to convert it back to JSON
        const config = JSON.parse(configString);
        expect(config.collectCoverage).toBe(true);
    });

    test("cli runs and fails", async () => {
        const cli = new CLI();
        mockRunCLI.mockImplementationOnce(() => {
            return Promise.resolve({ results: { success: false } });
        });
        const success = await cli.run([]);
        expect(success).toBe(false);
    });

    test("cli runs with arguments", async () => {
        const cli = new CLI();
        await cli.run(["argument1", "argument2", "argument3"]);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);
        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();

        // We pass the config to Jest as a string of JSON - so we need to convert it back to JSON
        const config = JSON.parse(configString);
        expect(config.testMatch).toBeUndefined();
        expect(config.testRegex).toBe("argument3");
    });

    test("cli prints version", async () => {
        const cli = new CLI();
        // This test is a success if this call does not blow up with a missing file
        cli.printVersion();
    });
});
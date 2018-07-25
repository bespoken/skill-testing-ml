const CONSTANTS = require("../lib/util/Constants");
// Best we can do with testing this is to mock jest and the call to runCLI
const mockRunCLI = jest.fn(() => {
    return Promise.resolve({ results: { success: true } });
});

let type;
const mockConfiguration = jest.fn(() => ({
    jestConfig: jest.fn(() => ({ collectCoverage: true })),
    value: jest.fn(() => type),
}));

jest.mock("jest", () => {
    return {
        runCLI: mockRunCLI,
    };
});

jest.mock("../lib/runner/Configuration", () => {
    return {
        configure: jest.fn(),
        instance: mockConfiguration
    };
});


const CLI = require("../lib/runner/CLI");

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

    test("cli runs with e2e setting", async () => {
        type = CONSTANTS.TYPE.e2e;
        const cli = new CLI();
        const success = await cli.run([]);
        expect(success).toBe(true);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);

        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();
        const runInBand = mockRunCLI.mock.calls[0][0].runInBand;
        expect(runInBand).toBe(true);

        // We pass the config to Jest as a string of JSON - so we need to convert it back to JSON
        const config = JSON.parse(configString);
        expect(config.collectCoverage).toBe(false);
    });
});
const CONSTANTS = require("../lib/util/Constants");
// Best we can do with testing this is to mock jest and the call to runCLI
const mockRunCLI = jest.fn(() => {
    return Promise.resolve({ results: { success: true } });
});

let type;
let defaultValue = true;
let runInBand = true;
const mockConfiguration = jest.fn(() => ({
    jestConfig: jest.fn(() => ({ collectCoverage: true })),
    value: jest.fn((first, second, third) => {
        switch (first) {
        case "type":
            return third ? defaultValue : type;
        case "runInBand":
            return runInBand;
        default:
            return defaultValue;
        }
    }),
}));

const mockConfigure = jest.fn();

jest.mock("jest", () => {
    return {
        runCLI: mockRunCLI,
    };
});

const mockChangeEnvironmentFileLocation = jest.fn();

jest.mock("../lib/runner/Configuration", () => {
    return {
        changeEnvironmentFileLocation: mockChangeEnvironmentFileLocation,
        configure: mockConfigure,
        instance: mockConfiguration,
    };
});


const CLI = require("../lib/runner/CLI");

describe("CLI", () => {
    beforeEach(() => {
        mockRunCLI.mockClear();
        mockConfigure.mockClear();
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

        const runInBand = mockRunCLI.mock.calls[0][0].runInBand;
        expect(runInBand).toBe(true);

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

    test("cli runs with runInBand setting", async () => {
        type = undefined;
        // This will return false for runInBand
        runInBand = false;
        const cli = new CLI();
        const success = await cli.run([]);
        expect(success).toBe(true);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);

        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();
        const runInBandCall = mockRunCLI.mock.calls[0][0].runInBand;
        expect(runInBandCall).toBe(false);
    });

    test("cli runs with path to test", async () => {
        const cli = new CLI();
        const success = await cli.run(["argument1", "argument2", "models"]);
        expect(success).toBe(true);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);
        expect(mockChangeEnvironmentFileLocation).toHaveBeenCalledTimes(0);
        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();
        const testPath = mockConfigure.mock.calls[0][1];
        expect(testPath).toBe("models");
    });

    test("cli runs with env override", async () => {
        const cli = new CLI();
        const success = await cli.run(["argument1", "argument2", "models"], { env: "somewhere/.env" });
        expect(success).toBe(true);
        expect(mockRunCLI).toHaveBeenCalledTimes(1);
        expect(mockChangeEnvironmentFileLocation).toHaveBeenCalledTimes(1);
        const configString = mockRunCLI.mock.calls[0][0].config;
        expect(configString).toBeDefined();
        const testPath = mockConfigure.mock.calls[0][1];
        expect(testPath).toBe("models");
    });
});
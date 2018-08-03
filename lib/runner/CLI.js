const Configuration = require("./Configuration");
const CONSTANTS = require("../util/Constants");
const debug = require("../util/Debug");
const fs = require("fs");
const jestModule = require("jest");
const path = require("path");

// We do the process handling here
process.on("unhandledRejection", (e) => {
    CLI.displayError(e);
    process.exit(1);
});

process.on("uncaughtException", (e) => {
    CLI.displayError(e);
    process.exit(1);
});

// Wraps call to jest - we use this so we can standardize our configuration
// Also, don't want to force people to learn Jest
class CLI {
    static displayError(e) {
        if (e.name) {
            // eslint-disable-next-line no-console
            console.error("Error - " + e.name + ":\n" + e.message);
        } else {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    }

    async run(argv, configurationOverrides) {
        // Set this environment variable every time - can be used inside of code to do useful things
        process.env.UNIT_TEST = true;

        const testPath = this.getTestPath(argv);
        await Configuration.configure(undefined, testPath, configurationOverrides);
        const jestConfig = Configuration.instance().jestConfig();
        if (argv.length >= 3) {
            jestConfig.testMatch = undefined;
            jestConfig.testRegex = argv[2];
        }
        let runInBand = false;
        const type = Configuration.instance().value("type");
        const invoker = Configuration.instance().value("invoker");
        if (type === CONSTANTS.TYPE.e2e || invoker === CONSTANTS.INVOKER.virtualDeviceInvoker){
            jestConfig.collectCoverage = false;
            runInBand = true;
        }
        debug("JEST Config: " + JSON.stringify(jestConfig));

        // Call Jest via API so we can stay in-process
        const returnValue = await jestModule.runCLI({ config: JSON.stringify(jestConfig), runInBand }, [process.cwd()]);
        const success = returnValue.results ? returnValue.results.success : false;
        return success;
    }

    printVersion() {
        // We use babel for distributions, in which case the package.json is in a different place
        const packagePath = path.join(__dirname, "../../package.json");
        const packageFile = fs.existsSync(packagePath) ? "../../package.json" : "../../../package.json";

        const packageJSON = require(packageFile);
        // eslint-disable-next-line no-console
        console.log("\nBespoken SkillTester - Version: " + packageJSON.version + "\n");
    }

    // returns a path where the test files are located, it is provided as parameter from cli
    // the parameter could be a regex, a path or a file
    // if it is a file, we return the path were is located
    getTestPath(argv) {
        let testPath = undefined;
        if (argv.length >= 3 && fs.existsSync(argv[2])) {
            const isDirectory = fs.lstatSync(argv[2]).isDirectory();
            testPath = isDirectory ? argv[2] : path.dirname(argv[2]);
        }
        return testPath;
    }
}

module.exports = CLI;
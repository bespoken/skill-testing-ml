const Configuration = require("./Configuration");
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

    async run(argv) {
        // Set this environment variable every time - can be used inside of code to do useful things
        process.env.UNIT_TEST = true;

        const testPath = argv.length >= 3 ? path.dirname(argv[2]) : undefined;
        await Configuration.configure(undefined, testPath);
        const jestConfig = Configuration.instance().jestConfig();
        if (argv.length >= 3) {
            jestConfig.testMatch = undefined;
            jestConfig.testRegex = argv[2];
        }
        let runInBand = false;
        const invoker = Configuration.instance().value("invoker");
        if (invoker === "VirtualDeviceInvoker"){
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
}

module.exports = CLI;
const Configuration = require("./Configuration");
const debug = require("./Debug");
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

        // We use babel for distributions, in which case the package.json is in a different place
        const packagePath = path.join(__dirname, "../package.json");
        const packageFile = fs.existsSync(packagePath) ? "../package.json" : "../../package.json";
        // We always print out the version number

        const packageJSON = require(packageFile);
        // eslint-disable-next-line no-console
        console.log("\nBespoken SkillTester - Version: " + packageJSON.version + "\n");

        await Configuration.configure();
        const jestConfig = Configuration.instance().jestConfig();
        if (argv.length >= 3) {
            jestConfig.testMatch = undefined;
            jestConfig.testRegex = argv[2];
        }

        debug("JEST Config: " + JSON.stringify(jestConfig));

        // Call Jest via API so we can stay in-process
        jestModule.runCLI({ config: JSON.stringify(jestConfig) }, [process.cwd()]);
    }
}

module.exports = CLI;
const Configuration = require("./Configuration");
const CONSTANTS = require("../util/Constants");
const debug = require("../util/Debug");
const fs = require("fs");
const jestModule = require("jest");
const LoggingErrorHelper = require("../util/LoggingErrorHelper");
const path = require("path");
const uuid = require("uuid/v4");
const { get } = require("lodash");
const { ResultsPublisher } = require("../runner/ResultsPublisher");

const Logger = "bst-test";

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
        LoggingErrorHelper.error(Logger, "Error using bst-test on Node: " + process.version);
        LoggingErrorHelper.error(Logger, e.stack);
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
        configurationOverrides = configurationOverrides ? configurationOverrides : {};
        configurationOverrides["runId"] = uuid();
        configurationOverrides["runTimestamp"] = Date.now();
        if (configurationOverrides.env) {
            Configuration.changeEnvironmentFileLocation(configurationOverrides.env);
        } else {
            require("dotenv").config();
        }

        await Configuration.configure(undefined, testPath, configurationOverrides);
        const jestConfig = Configuration.instance().jestConfig();
        if (argv.length >= 3) {
            jestConfig.testMatch = undefined;
            jestConfig.testRegex = argv[2];
        }

        const runInBand = Configuration.instance().value("runInBand", undefined, true);

        const type = Configuration.instance().value("type");
        const invoker = Configuration.instance().value("invoker");

        const isRunningRemote = type === CONSTANTS.TYPE.e2e
            || type === CONSTANTS.TYPE.simulation
            || invoker === CONSTANTS.INVOKER.virtualDeviceInvoker
            || invoker === CONSTANTS.INVOKER.SMAPIInvoker;

        if (isRunningRemote) {
            jestConfig.collectCoverage = false;
        }

        jestConfig.globals = { overrides: configurationOverrides };
        debug("JEST Config: " + JSON.stringify(jestConfig));

        const config = JSON.stringify(jestConfig);
        // Call Jest via API so we can stay in-process
        return jestModule.runCLI({ config, runInBand }, [process.cwd()])
            // Join all bespokenResults in one array for sending to bespoken-api/reporting 
            .then(jestResult => get(jestResult, "results.testResults", []).reduce((p, c) => p.concat(get(c, "bespokenResults", {})), []))
            .then(bespokenResults => new ResultsPublisher().publishResults(bespokenResults))
            .then(jestResult => jestResult.results ? jestResult.results.success : false);
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
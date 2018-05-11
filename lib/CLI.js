const Configuration = require("./Configuration");
const debug = require("./Debug");
const fs = require("fs");
const jestModule = require("jest");
const path = require("path");

// Wraps call to jest - we use this so we can standardize our configuration
// Also, don't want to force people to learn Jest
module.exports = class CLI {
    async run() {
        // We use babel for distributions, in which case the package.json is in a different place
        const packagePath = path.join(__dirname, "../package.json");
        const packageFile = fs.existsSync(packagePath) ? "../package.json" : "../../package.json";
        // We always print out the version number

        const packageJSON = require(packageFile);
        // eslint-disable-next-line no-console
        console.log("\nBespoken SkillTester - Version: " + packageJSON.version + "\n");

        await Configuration.configure();
        const jestConfig = Configuration.instance().jestConfig();

        debug("JEST Config: " + JSON.stringify(jestConfig));
        // Call Jest via API so we can stay in-process
        jestModule.runCLI({ config: JSON.stringify(jestConfig) }, [process.cwd()]);
    }
}
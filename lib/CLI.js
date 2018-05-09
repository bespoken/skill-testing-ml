const Configuration = require("./Configuration");
const jestModule = require("jest");

// Wraps call to jest - we use this so we can standardize our configuration
// Also, don't want to force people to learn Jest
module.exports = class CLI {
    async run() {
        await Configuration.configure();
        const jestConfig = Configuration.instance().jestConfig();

        console.log("JEST Config: " + JSON.stringify(jestConfig));
        // Call Jest via API so we can stay in-process
        jestModule.runCLI({ config: JSON.stringify(jestConfig) }, [process.cwd()]);
    }
}
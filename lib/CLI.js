const child_process = require("child_process");
const Configuration = require("./Configuration");

// Wraps call to jest - we use this so we can standardize our configuration
// Also, don't want to force people to learn Jest
module.exports = class CLI {
    async run() {
        await Configuration.configure();
        // Figure out the path to Jest - should be under node_modules/.bin
        const jestPath = Configuration.instance().jestPath();
        const jestConfig = Configuration.instance().jestConfig();

        console.log("JEST Config: " + JSON.stringify(jestConfig));
        child_process.spawn(jestPath, ["--config", JSON.stringify(jestConfig)], { stdio: "inherit" });
    }
}
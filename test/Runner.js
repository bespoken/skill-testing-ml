const VirtualAlexaRunner = require("../lib/VirtualAlexaRunner");

const runner = new VirtualAlexaRunner({
    handler: "test/index.js",
    locale: "en-US",
});
runner.run();
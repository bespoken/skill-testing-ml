const TestParser = require("./TestParser");

module.exports = class TestRunner {
    constructor(config) {
        this._config = config;
    }

    run() {
        throw new Error("Operation not implemented");
    }

    parse(testFile) {
        const parser = new TestParser(testFile);
        return parser.parse();
    }
}


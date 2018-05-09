const fs = require("fs");
const TestParser = require("./TestParser");

module.exports = class TestRunner {
    constructor(config) {
        this._config = config;
    }

    async run(testFile) {
        return new Promise((resolve, reject) => {
            fs.readFile(testFile, "utf8", (error, data) => {
                if (error) {
                    reject(error);
                }

                const testSuite = this.parseContents(data);
                testSuite.fileName = testFile;
                resolve(this.runSuite(testSuite));
            });
        });
    }

    async runSuite(testSuite) {
        throw new Error("Operation not implemented");
    }

    parseContents(testContents) {
        const parser = new TestParser();
        parser.load(testContents);
        return parser.parse();
    }

    get configuration() {
        return this._config;
    }
}


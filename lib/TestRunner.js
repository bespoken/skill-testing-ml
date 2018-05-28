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

                try {
                    const testSuite = this.parseContents(testFile, data);
                    resolve(this.runSuite(testSuite));
                } catch (e) {
                    reject(e);
                }

            });
        });
    }

    // eslint-disable-next-line no-unused-vars
    async runSuite(testSuite) {
        throw new Error("Operation not implemented");
    }

    parseContents(fileName, testContents) {
        const parser = new TestParser();
        parser.fileName = fileName;
        parser.load(testContents);
        return parser.parse();
    }

    get configuration() {
        return this._config;
    }
}


const ParserError = require("./ParserError");
const Util = require("../util/Util");

module.exports = class Test {
    constructor(suite, metadata, interactions) {
        this._testSuite = suite;
        this._description = undefined;
        if (metadata) {
            if (Util.isString(metadata)) {
                this._description = metadata;
            } else {
                this._metadata = metadata;
                this._description = metadata.description;
            }
        }
        this._interactions = interactions;
        this._skip = false;
        this._only = false;
    }

    get description() {
        return this._description;
    }

    get hasGoto() {
        return this.interactions.find((interaction) => interaction.hasGoto);
    }

    get interactions() {
        return this._interactions;
    }

    get only() {
        return this._only;
    }

    set only(only) {
        this._only = only;
    }

    get skip() {
        return this._skip;
    }

    set skip(skip) {
        this._skip = skip;
    }

    get testSuite() {
        return this._testSuite;
    }

    // Make sure all any goto statements work
    validate() {
        for (const interaction of this.interactions) {
            for (const assertion of interaction.assertions) {
                if (assertion.goto) {
                    let matched = false;
                    for (const i2 of this.interactions) {
                        if (i2.utterance === assertion.goto) {
                            matched = true;
                            break;
                        }
                    }

                    if (!matched) {
                        throw ParserError.error(this.testSuite.fileName,
                            "No match for goto: " + assertion.goto,
                            assertion.lineNumber);
                    }
                }
            }
        }
        return true;
    }
}
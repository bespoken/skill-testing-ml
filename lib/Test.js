const Util = require("./Util");

module.exports = class Test {
    constructor(metadata, interactions) {
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
    }

    get description() {
        return this._description;
    }

    get interactions() {
        return this._interactions;
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
                        throw new Error("No match for goto: " + assertion.goto);
                    }
                }
            }
        }
        return true;
    }
}
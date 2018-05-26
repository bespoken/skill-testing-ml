const _ = require("lodash");

module.exports = class Test {
    constructor(metadata, interactions) {
        this._description = undefined;
        if (metadata) {
            if (_.isObject(metadata)) {
                this._metadata = metadata;
                this._description = metadata.description;
            } else {
                this._description = metadata;
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
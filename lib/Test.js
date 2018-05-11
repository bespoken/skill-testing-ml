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
}
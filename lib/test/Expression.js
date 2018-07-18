const _ = require("lodash");
const Util = require("../util/Util");

module.exports = class Expression {
    static isExpression(element) {
        const keys = Object.keys(element);
        return (keys.length > 0 && keys[0].startsWith("request"));
    }
    constructor(element) {
        this._path = Object.keys(element)[0];
        this._value = element[this._path];
    }

    get path() {
        return this._path;
    }

    get value() {
        return Util.cleanValue(this._value);
    }

    apply(json) {
        // Chop off the mandatory request at the front
        const paths = this.path.split(".").slice(1);
        const path = paths.join(".");
        _.set(json, path, this.value);
    }
}
const _ = require("lodash");

module.exports = class Assertions {
    constructor(path, operator, value) {
        this._path = path;
        this._operator = operator;
        this._value = value;
    }

    validate() {
        return true;
    }

    get path() {
        return this._path;
    }

    get operator() {
        return this._operator;
    }

    get value() {
        return this._value;
    }

    valueAsString() {
        return _.replace(this._value,  /"/g, "");
    }
}
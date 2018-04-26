const _ = require("lodash");
const jsonpath = require("jsonpath");

const OPERATORS = ["==", "=~", "!=", ">", ">=", "<", "<="]

module.exports = class Assertions {
    constructor(path, operator, value) {
        this._path = path;
        this._operator = operator;
        this._value = value;
    }

    validate() {
        const path = jsonpath.parse(this._path);
        if (!path) {
            throw new Error("Invalid JSON path: " + this._path);
        }

        if (!OPERATORS.includes(this._operator)) {
            throw new Error("Invalid operator: " + this._operator);
        }
    }

    evaluate(json) {
        const jsonValue = jsonpath.value(json, this.path);
        if (this.operator === "==") {
            return jsonValue === this.value;
        } else if (this.operator === "=~") {
            const regex = new RegExp(this.value);
            return regex.test(jsonValue);
        } else {
            throw "Operator not implemented yet: " + this.operator;
        }
    }

    get path() {
        return this._path;
    }

    get operator() {
        return this._operator;
    }

    get value() {
        // Special handling for values:
        if (this._value === "undefined") {
            this._value = undefined;
        }
        return this._value;
    }

    toString(json) {
        const jsonValue = jsonpath.value(json, this.path);
        return "[" + this.path + "]" + jsonValue + " " + this.operator + " " + this.value;
    }

    valueAsString() {
        return _.replace(this._value,  /"/g, "");
    }
}
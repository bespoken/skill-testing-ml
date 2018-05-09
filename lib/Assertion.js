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
            if (this.value === undefined) {
                return jsonValue === undefined;
            }
            return jsonValue && jsonValue.includes(this.value);
        } else if (this.operator === "=~") {
            const regex = new RegExp(this.value);
            return regex.test(jsonValue);
        } else if (this.operator === "!=") {
            if (this.value === undefined) {
                return jsonValue !== undefined;
            }
            return !jsonValue || !jsonValue.includes(this.value);
        }
         else {
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
        //  Turn "undefined" string into undefined
        //  Remove quotes from quoted phrase
        if (this._value === "undefined") {
            this._value = undefined;
        } else if (this._value && this._value.startsWith("\"") && this._value.endsWith("\"")) {
            this._value = this._value.substr(1, this._value.length-2);
        }
        return this._value;
    }

    toString(json) {
        const jsonValue = jsonpath.value(json, this.path);
        return "Expected value to " + this.operator + "\n"
            + "\t" + this.value + "\n"
            + "Received:\n"
            + "\t" + jsonValue + "\n";
        // + "at dummy:0:0"; Specify fileName and line number to print out nice view of text
        // Cant't figure out how to get line numbers yet from YAML parser
    }
}

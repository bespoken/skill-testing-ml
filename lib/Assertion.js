const HandlerError = require("./HandledError");
const jsonpath = require("jsonpath");

const OPERATORS = ["==", "=~", "!=", ">", ">=", "<", "<="]

module.exports = class Assertions {
    constructor(path, operator, value) {
        this._path = path;
        this._operator = operator;
        this._value = value;
        this._goto = undefined;
        this.parse();
    }

    parse() {
        if (this.exit) {
            return;
        }

        // Looks for a goto in the value statement
        if (this._value && this._value.includes(" goto ")) {
            const gotoRegex = /(.*) goto (.*)/i
            const matchArray = this._value.match(gotoRegex);
            if (matchArray.length === 2) {
                throw HandlerError.error(HandlerError.CODE_YAML_SYNTAX(),
                    "Invalid goto - does not have label: " + this._value);
            } else if (matchArray.length === 3) {
                this._value = matchArray[1];
                this._goto = matchArray[2];
            }
        }
    }

    validate() {
        if (this.exit) {
            return;
        }

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

            if (jsonValue !== undefined) {
                return this.evaluateString(this.value, jsonValue);
            }
            return false;
        } else if (this.operator === "=~") {
            // If the user specifies the regex with forward-slashes to start and end, do special handling
            let regexString = this.value;
            let options = "";
            if (this.value.startsWith("/")) {
                regexString = regexString.substr(1);
                // Now get the last /, and treat the part after as options
                const endIndex = regexString.lastIndexOf("/");
                if (endIndex + 1 < regexString.length) {
                    options = regexString.substr(endIndex + 1);
                }
                regexString = regexString.substr(0, endIndex);
            }
            const regex = new RegExp(regexString, options);
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

    evaluateString(expectedValue, actualValue) {
        // If the values are not strings, convert to a string for ease of comparison
        if (!(typeof expectedValue === "string")) {
            expectedValue += "";
        }

        if (!(typeof actualValue === "string")) {
            actualValue += "";
        }

        // We allow for a wild-card *
        let regex = expectedValue.trim().split("*").join(".*");
        // Escape special values that we do NOT want to treat as a wild-card
        regex = regex.split("+").join("\\+");
        regex = regex.split("^").join("\\^");
        regex = regex.split("$").join("\\$");
        regex = regex.split("?").join("\\?");
        return new RegExp(regex).test(actualValue);
    }

    get exit() {
        return this._path === "exit";
    }

    get goto() {
        return this._goto;
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
        } else if (this._value
            && typeof this._value === "string"
            && this._value.startsWith("\"")
            && this._value.endsWith("\"")) {
            this._value = this._value.substr(1, this._value.length-2);
        }
        return this._value;
    }

    toString(json) {
        const jsonValue = jsonpath.value(json, this.path);
        return "Expected value at [" + this.path + "] to " + this.operator + "\n"
            + "\t" + this.value + "\n"
            + "Received:\n"
            + "\t" + jsonValue + "\n";
        // + "at dummy:0:0"; Specify fileName and line number to print out nice view of text
        // Cant't figure out how to get line numbers yet from YAML parser
    }
}

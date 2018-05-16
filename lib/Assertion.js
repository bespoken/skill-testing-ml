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
        if (this._value
            && typeof this._value === "string"
            && this._value.includes(" goto ")) {
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
        if (this.operator === "==" || this.operator === "=~") {
            if (this.value === undefined) {
                return jsonValue === undefined;
            }

            let match = false;
            if (jsonValue !== undefined) {
                if (Array.isArray(this.value)) {
                    for (const value of this.value) {
                        match = this.evaluateRegexOrString(this.operator, value, jsonValue);
                        // Once matched, do not need to process further
                        if (match) {
                            break;
                        }
                    }
                } else {
                    match = this.evaluateRegexOrString(this.operator, this.value, jsonValue);
                }
            }
            return match;
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

    evaluateRegexOrString(operator, expectedValue, actualValue) {
        // If the operator is the regex operator, or the value starts with /, we treat it as a regex
        if (this.isRegex(expectedValue)) {
            return this.evaluateRegex(expectedValue, actualValue);
        } else {
            return this.evaluateString(expectedValue, actualValue);
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

    evaluateRegex(expectedValue, actualValue) {
        let regexString = expectedValue;
        let options = "";
        if (regexString.startsWith("/")) {
            regexString = regexString.substr(1);
            // Now get the last /, and treat the part after as options
            const endIndex = regexString.lastIndexOf("/");
            if (endIndex + 1 < regexString.length) {
                options = regexString.substr(endIndex + 1);
            }
            regexString = regexString.substr(0, endIndex);
        }
        const regex = new RegExp(regexString, options);
        return regex.test(actualValue);
    }

    isRegex(expectedValue) {
        return this.operator === "=~" ||
            (typeof expectedValue === "string" && expectedValue.startsWith("/"));
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
        if (typeof this._value === "string") {
            this._value = this.cleanValueString(this._value);
        } else if (Array.isArray(this._value)) {
            for (let i = 0;i < this._value.length; i++) {
                this._value[i] = this.cleanValueString(this._value[i]);
            }
        }
        return this._value;
    }

    cleanValueString(value) {
        if (!value || typeof value !== "string") {
            return;
        }

        if (value === "undefined") {
            value = undefined;
        } else if (value.startsWith("\"")
            && value.endsWith("\"")) {
            value = value.substr(1, value.length-2);
        }
        return value;
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

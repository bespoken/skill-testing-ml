const jsonpath = require("jsonpath");
const ParserError = require("./ParserError");
const Util = require("./Util");

const OPERATORS = ["==", "=~", "!=", ">", ">=", "<", "<="]
const NUMERIC_OPERATORS = [">", ">=", "<", "<="]

module.exports = class Assertions {
    constructor(interaction, path, operator, value) {
        this._interaction = interaction;
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
        if (Util.isString(this._value)
            && this._value.includes(" goto ")) {
            const gotoRegex = /(.*) goto (.*)/i
            const matchArray = this._value.match(gotoRegex);
            if (matchArray.length === 2) {
                throw ParserError.interactionError(this.interaction,
                    "Invalid goto - does not have label: " + this._value,
                    this.lineNumber);
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
            throw ParserError.interactionError(this.interaction,
                "Invalid JSON path: " + this._path,
                this.lineNumber);
        }

        if (!OPERATORS.includes(this._operator)) {
            throw ParserError.interactionError(this.interaction,
                "Invalid operator: " + this._operator,
                this.lineNumber);
        }

        // Check to make sure the expected value is a number if this is a numeric operator
        if (NUMERIC_OPERATORS.includes(this._operator)) {
            if (isNaN(this.value)) {
                throw ParserError.interactionError(this.interaction,
                    "Invalid expected value - must be numeric: " + this.value,
                    this.lineNumber);
            }
        }
    }

    evaluate(json) {
        let jsonValue = this.valueAtPath(json);

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
        } else if (NUMERIC_OPERATORS.includes(this.operator)) {
            if (isNaN(jsonValue)) {
                return false;
            }

            const expectedValue = parseInt(this.value, 10);
            const actualValue = parseInt(jsonValue, 10);

            if (this.operator === ">") {
                return actualValue > expectedValue;
            } else if (this.operator === ">=") {
                return actualValue >= expectedValue;
            } else  if (this.operator === "<") {
                return actualValue < expectedValue;
            } else  if (this.operator === "<=") {
                return actualValue <= expectedValue;
            }
        } else if (this.operator === "!=") {
            if (this.value === undefined) {
                return jsonValue !== undefined;
            }
            return !jsonValue || !jsonValue.includes(this.value);
        } else {
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
        if (!Util.isString(expectedValue)) {
            expectedValue += "";
        }

        if (!Util.isString(actualValue)) {
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
            (Util.isString(expectedValue) && expectedValue.startsWith("/"));
    }

    get exit() {
        return this._path === "exit";
    }

    get goto() {
        return Util.cleanString(this._goto);
    }

    get interaction() {
        return this._interaction;
    }

    get lineNumber() {
        return this._lineNumber;
    }

    set lineNumber(number) {
        this._lineNumber = number;
    }

    get path() {
        return this._path;
    }

    get operator() {
        return this._operator;
    }

    get value() {
        return Util.cleanValue(this._value);
    }

    valueAtPath(json) {
        return json ? jsonpath.value(json, this.path) : undefined;
    }

    toString(json) {
        const jsonValue = this.valueAtPath(json);
        let expectedValueString = "\t" + this.value + "\n";
        let operator = this.operator;
        if (Array.isArray(this.value)) {
            operator = "be one of:";
            expectedValueString = "";
            for (const value of this.value) {
                expectedValueString += "\t" + value + "\n";
            }
        } else if (NUMERIC_OPERATORS.includes(this.operator)) {
            operator = "be " + this.operator;
        }

        let message = "Expected value at [" + this.path + "] to " + operator + "\n"
            + expectedValueString
            + "Received:\n"
            + "\t" + jsonValue + "\n";

        // If we have a line number, show it
        if (this.lineNumber) {
            message += "at " + this.interaction.test.testSuite.fileName + ":" + (this.lineNumber + 1) + ":0";
        }
        return message;
    }
}

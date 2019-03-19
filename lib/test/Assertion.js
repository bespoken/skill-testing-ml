const jsonpath = require("jsonpath-bespoken");
const ParserError = require("./ParserError");
const Util = require("../util/Util");

const OPERATORS = ["==", "=~", "!=", ">", ">=", "<", "<="];
const NUMERIC_OPERATORS = [">", ">=", "<", "<="];

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
            const gotoRegex = /(.*) goto (.*)/i;
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
        const path = jsonpath.parse(this.path);
        if (!path) {
            throw ParserError.interactionError(this.interaction,
                "Invalid JSON path: " + this.path,
                this.lineNumber);
        }

        if (!OPERATORS.includes(this.operator)) {
            throw ParserError.interactionError(this.interaction,
                "Invalid operator: " + this.operator,
                this.lineNumber);
        }

        // Check to make sure the expected value is a number if this is a numeric operator
        if (NUMERIC_OPERATORS.includes(this.operator)) {
            if (isNaN(this.value)) {
                throw ParserError.interactionError(this.interaction,
                    "Invalid expected value - must be numeric: " + this.value,
                    this.lineNumber);
            }
        }
    }

    evaluate(response) {
        const testSuite = response.interaction && response.interaction.test && response.interaction.test.testSuite; 
        const json = response.json;
        let jsonValue = this.valueAtPath(json);

        if (this.operator === "==" || this.operator === "=~") {
            if (this.value === undefined) {
                return jsonValue === undefined;
            }

            let match = false;
            const ignoreCase = response.ignoreCase(this.path);
            if (jsonValue !== undefined) {
                if (Array.isArray(this.value)) {
                    for (const value of this.value) {
                        const localizedValue = (testSuite && testSuite.getLocalizedValue(value)) || value;
                        match = this.evaluateRegexOrString(this.operator, localizedValue, jsonValue, ignoreCase);
                        // Once matched, do not need to process further
                        if (match) {
                            break;
                        }
                    }
                } else {
                    const localizedValue = (testSuite && testSuite.getLocalizedValue(this.value)) || this.value;
                    match = this.evaluateRegexOrString(this.operator, localizedValue, jsonValue, ignoreCase);
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
            if (Array.isArray(this.value)) {
                let resultNotEqual = true;
                for (const value of this.value) {
                    const localizedValue = (testSuite && testSuite.getLocalizedValue(value)) || value;
                    resultNotEqual = jsonValue.includes(localizedValue);
                    if (resultNotEqual) {
                        return false;
                    }
                }
                return true;
            } else {
                return !jsonValue || !jsonValue.includes(this.value);
            }
            
        } else {
            throw "Operator not implemented yet: " + this.operator;
        }
    }

    evaluateRegexOrString(operator, expectedValue, actualValue, ignoreCase) {
        // If the operator is the regex operator, or the value starts with /, we treat it as a regex
        if (this.isRegex(expectedValue)) {
            return this.evaluateRegex(expectedValue, actualValue, ignoreCase);
        } else {
            return this.evaluateString(expectedValue, actualValue, ignoreCase);
        }
    }

    evaluateString(expectedValue, actualValue, ignoreCase) {
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

        let options = "";
        if (ignoreCase) {
            options = "i";
        }
        return new RegExp(regex, options).test(actualValue);
    }

    evaluateRegex(expectedValue, actualValue, ignoreCase) {
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
        if (ignoreCase && options.indexOf("i") == -1) {
            options += "i";
        }
        const regex = new RegExp(regexString, options);
        return regex.test(actualValue);
    }

    isRegex(expectedValue) {
        return this.operator === "=~" ||
            (Util.isString(expectedValue) && expectedValue.startsWith("/"));
    }

    get exit() {
        return this.path === "exit";
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
        return Util.cleanString(this._path);
    }

    get operator() {
        return Util.cleanString(this._operator);
    }

    get value() {
        return Util.cleanValue(this._value);
    }

    valueAtPath(json) {
        return json ? jsonpath.value(json, this.path) : undefined;
    }

    toString(json, errorOnResponse) {
        if (errorOnResponse) {
            return errorOnResponse;
        }
        const testSuite = this.interaction && this.interaction.test && this.interaction.test.testSuite; 
        const jsonValue = this.valueAtPath(json);
        const localizedValue = (testSuite && testSuite.getLocalizedValue(this.value)) || this.value;
        let expectedValueString = "\t" + localizedValue + "\n";
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
            message += "at " + this.interaction.test.testSuite.fileName + ":" + this.lineNumber + ":0";
        }
        return message;
    }
};

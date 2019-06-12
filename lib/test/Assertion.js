const jsonpath = require("jsonpath-bespoken");
const ParserError = require("./ParserError");
const Util = require("../util/Util");

const OPERATORS = ["==", "=~", "!=", ">", ">=", "<", "<="];
const NUMERIC_OPERATORS = [">", ">=", "<", "<="];

/**
 * Represents an assertion to evaluate during an interaction
 */
class Assertions {
    /**
     *
     * @param {TestInteraction} interaction - the interaction that is being evaluated
     * @param {string} path - the Json path of the property in the response being evaluated
     * @param {string} operator - the operator used to evaluate the response property
     * @param {string} value - the value that is evaluated against the response property
     * @param {string[]} variables - variables inside the utterance that can be replaced
     * @param {string} originalOperator - the operator before parsing the interaction
     */
    constructor(interaction, path, operator, value, variables, originalOperator) {
        this._interaction = interaction;
        this._path = path;
        this._operator = operator;
        this._value = value;
        this._goto = undefined;
        this._variables = variables;
        this._originalOperator = originalOperator;
        this.parse();
    }

    /**
     * Parses the value to check and set the goto property if needed
     */
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

    /**
     * Validate if the assertion syntax is correct if not throws a Parser Error
     * @throws {ParserError}
     */
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

    /**
     * Evaluates this assertion against the provided response and returns true if it succeeds
     * @param {object} response - the response to which we do the assertion
     * @return {boolean}
     */
    evaluate(response) {
        if (this.exit) {
            return true;
        }
        const testSuite = response.interaction && response.interaction.test && response.interaction.test.testSuite; 
        const json = response.json;
        let jsonValue = this.valueAtPath(json);
        const ignoreCase = response.ignoreCase(this.path);

        if (this.operator === "==" || this.operator === "=~") {
            if (this.value === undefined) {
                return jsonValue === undefined;
            }

            let match = false;
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

            if (jsonValue === undefined) {
                return this.value !== undefined;
            }

            if (ignoreCase) {
                jsonValue = jsonValue.toLowerCase();
            }

            if (Array.isArray(this.value)) {
                let resultNotEqual = true;
                for (const value of this.value) {
                    let localizedValue = (testSuite && testSuite.getLocalizedValue(value)) || value;
                    if (ignoreCase) {
                        localizedValue = localizedValue && localizedValue.toLowerCase();
                    }
                    resultNotEqual = jsonValue.includes(localizedValue);
                    if (resultNotEqual) {
                        return false;
                    }
                }
                return true;
            } else {
                const valueToCompare = ignoreCase ? this.value.toLowerCase() : this.value;
                return !jsonValue || !jsonValue.includes(valueToCompare);
            }
            
        } else {
            throw "Operator not implemented yet: " + this.operator;
        }
    }

    /**
     * Evaluates if a regex or string complies with the assertion
     * @param {string} operator - Operator used to evaluate the expected value against the actual one.
     * @param {string} expectedValue - Value defined in the assertion
     * @param {string} actualValue - Actual value returning in the response
     * @param {boolean} ignoreCase - ignore case when evaluating the strings
     * @return {boolean}
     */
    evaluateRegexOrString(operator, expectedValue, actualValue, ignoreCase) {
        // If the operator is the regex operator, or the value starts with /, we treat it as a regex
        let operatorToCompare = operator;
        if (this._originalOperator === ":" && expectedValue && expectedValue.includes) {
            operatorToCompare = expectedValue.includes("*") ? "=~" : "==";
        }

        if (operatorToCompare === "=~") {
            return this.evaluateRegex(expectedValue, actualValue, ignoreCase);
        } else {
            return this.evaluateString(expectedValue, actualValue, ignoreCase);
        }
    }

    /**
     * Evaluates if the actual value contains the expected value
     * @param {string} expectedValue - Value defined in the assertion
     * @param {string} actualValue - Actual value returning in the response
     * @param {boolean} ignoreCase - ignore case when evaluating the strings
     * @return {boolean}
     */
    evaluateString(expectedValue, actualValue, ignoreCase) {
        // If the values are not strings, convert to a string for ease of comparison
        if (!Util.isString(expectedValue)) {
            expectedValue += "";
        }

        if (!Util.isString(actualValue)) {
            actualValue += "";
        }

        let expected = expectedValue;
        let actual = actualValue;
        if (ignoreCase) {
            expected = expectedValue ? expectedValue.toLowerCase() : expectedValue;
            actual = actualValue ? actualValue.toLowerCase() : actualValue;
        }

        return actual.includes(expected);
    }

    /**
     * Evaluates if the actual value matches the expected value regex
     * @param {string} expectedValue -  expected value regex defined in the assertion
     * @param {string} actualValue - Actual value returning in the response
     * @param {boolean} ignoreCase - ignore case when evaluating the strings
     * @return {boolean}
     */
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

    /**
     * Validates if the expected value is a regex
     * @param {string} expectedValue - a string expected value
     * @return {boolean}
     */
    isRegex(expectedValue) {
        return this.operator === "=~" ||
            (Util.isString(expectedValue) && expectedValue.startsWith("/"));
    }

    /**
     * Returns true if this assertion includes an exit
     * @return {boolean}
     */
    get exit() {
        return this.path === "exit";
    }

    /**
     * Returns true if this assertion includes a go to
     * @return {boolean}
     */
    get goto() {
        return Util.cleanString(this._goto);
    }

    /**
     * Returns the interaction that contains this assertion
     * @return {TestInteraction}
     */
    get interaction() {
        return this._interaction;
    }

    /**
     * Returns in which line number this assertion is located
     * @return {number}
     */
    get lineNumber() {
        return this._lineNumber;
    }

    /****
     * Set in which line number this assertion is located
     * @param {number} number - which line number this assertion is located
     */
    set lineNumber(number) {
        this._lineNumber = number;
    }

    /**
     * Returns what is the Json path that we are evaluating in the response
     * @return {string}
     */
    get path() {
        return Util.cleanString(this._path);
    }

    /**
     * Returns what is the operator that we are using to evaluate the response
     * @return {string}
     */
    get operator() {
        return Util.cleanString(this._operator);
    }

    /**
     * Returns what is the value against we are evaluating
     * @return {string | string[]}
     */
    get value() {
        return Util.cleanValue(this._value);
    }

    /**
     * Returns a list of variables to replace in the assertion
     * @return {string[]}
     */
    get variables() {
        return this._variables;
    }

    /**
     * Returns the operator before parsing the interaction
     * @return {string}
     */
    get originalOperator() {
        return Util.cleanString(this._originalOperator);
    }

    /**
     * Returns what is in the value in the response for the Json path
     * @param {object} json - the response being evaluated
     * @return {string}
     */
    valueAtPath(json) {
        return json ? jsonpath.value(json, this.path) : undefined;
    }

    /**
     * Returns the assertion evaluation in a string with the error details if the assertion has failed
     * @param {object} json - the response being evaluated
     * @param {string} errorOnResponse - error that was generated, if present this is what we would return
     * @return {string}
     */
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
}

module.exports = Assertions;

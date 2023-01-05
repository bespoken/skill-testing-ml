const _ = require("lodash");
const Assertion = require("./Assertion");
const Configuration = require("../runner/Configuration");
const Expression = require("./Expression");
const fs = require("fs");
const ParserError = require("./ParserError");
const Test = require("./Test");
const TestInteraction = require("./TestInteraction");
const TestSuite = require("./TestSuite");
const Util = require("../util/Util");
const yaml = require("js-yaml-bespoken");
const { isEmpty, get } = require("lodash");

/**
 * Represents the parser used for converting a yaml file into a test suite
 */
class TestParser {
    /**
     *
     * @param {string} fileName - the yaml file that will be parsed
     */
    constructor(fileName) {
        this.fileName = fileName;
        if (this.fileName) {
            this.contents = fs.readFileSync(this.fileName, "utf8");
        }
    }

    /**
     * Set the contents of the YML file
     * @param {object} contents - set the contents of the file
     */
    load(contents) {
        this.contents = contents;
    }

    /**
     * Add quotes to string if not a regex
     * @param {string} origin - original string
     * @return {string} string with quotes
     */
    addQuotesToNonRegexString(origin) {
        if (origin.startsWith && origin.startsWith("/")) {
            return origin;
        }
        return `"${origin}"`;
    }

    /**
     * loads a yaml object into a yaml file
     * @param {object} yamlObject - yaml representation of a yaml file
     */
    loadYamlObject(yamlObject) {
        const configuration = yamlObject.configuration;
        const tests = yamlObject.tests;
        this.contents = "";
        if (configuration) {
            this.contents += "---\nconfiguration:\n";
            this.contents += Object.keys(configuration)
                .map(key => `  ${key}: ${configuration[key]}`)
                .join("\n");
        }

        if (tests && tests.length) {
            for (let i = 0; i < tests.length; i++) {
                let testContent = "";
                if (i === 0 && this.contents === "") {
                    testContent = "---\n";
                } else {
                    testContent = "\n---\n";
                }
                const testSuffix = tests[i].only ? ".only" :
                    tests[i].skip ? ".skip" : "";
                testContent += `- test${testSuffix} : ${tests[i].name}\n`;
                if (tests[i].tags && tests[i].tags.length) {
                    testContent += `- tags : ${tests[i].tags.join(", ")}\n`;
                }
                testContent += tests[i].interactions
                    .map((interaction) => {
                        const expected = interaction.expected;
                        const expressions = interaction.expressions;
                        const hasExpressions = expressions && expressions.length > 0;
                        if (expected.length === 1
                            && expected[0].action === "prompt"
                            && !Array.isArray(expected[0].value)
                            && !hasExpressions) {
                            return `- ${interaction.input} ${expected[0].operator} ${this.addQuotesToNonRegexString(expected[0].value)}\n`;
                        }
                        let interactionString = `- ${interaction.input} :\n`;
                        interactionString += expected.map((item) => {
                            if (!Array.isArray(item.value)) {
                                return `  - ${item.action} ${item.operator} ${this.addQuotesToNonRegexString(item.value)}\n`;
                            }
                            const value = item.value.map(itemValue => `    - ${this.addQuotesToNonRegexString(itemValue)}`).join("\n");
                            return `  - ${item.action} ${item.operator}\n${value}\n`;
                        }).join("");
                        if (expressions && expressions.length) {
                            interactionString += expressions.map((item) => {
                                if (!Array.isArray(item.value)) {
                                    return `  - ${item.path} : ${Util.isString(item.value) ? this.addQuotesToNonRegexString(item.value) : item.value}\n`;
                                }
                                const value = item.value.map(itemValue =>
                                    `    - ${Util.isString(itemValue) ? this.addQuotesToNonRegexString(itemValue) : itemValue}`).join("\n");
                                return `  - ${item.path} :\n${value}\n`;
                            }).join("");
                        }
                        return interactionString;
                    }).join("");
                this.contents += testContent;
            }
        }

        if (this.contents.includes(" : \"\"\n-")) {
            this.contents = this.contents.replace(/ : ""\n-/gi, "\n-");
        }
        if (this.contents.includes(" : \"\"\n")) {
            this.contents = this.contents.replace(/ : ""\n/gi, "\n");
        }
    }

    /**
     * Parses a test file and returns a test suite
     * @param {string} configurationOverride - configuration override for the test suite
     * @return {TestSuite}
     */
    parse(configurationOverride) {
        try {
            const contents = this.findReplace(this.contents, configurationOverride);
            const documents = yaml.loadAll(contents);
            let configuration;
            let tests = documents;
            if (documents.length > 1 && documents[0].configuration) {
                if (!Util.isObject(documents[0].configuration)) {
                    throw ParserError.globalError(this.fileName,
                        "Configuration element is not an object",
                        Util.extractLine(documents[0].configuration));
                }
                configuration = _.assign(documents[0].configuration, configurationOverride);
                tests = documents.slice(1);
            } else {
                configuration = configurationOverride;
            }


            const suite = new TestSuite(this.fileName, configuration);
            suite.tests = this.parseTests(suite, tests);
            suite.rawTestContent = this.contents;
            return suite;
        } catch (e) {
            throw e;
        }
    }

    /**
     * Parses the tests section of the yaml test file
     * @param {TestSuite} suite - the complete test suite
     * @param {object} rawTests - the raw tests from the yaml file
     * @return {Test[]}
     */
    parseTests(suite, rawTests) {
        const tests = [];
        const testNames = {};
        let testCount = 0;
        for (const test of rawTests) {
            testCount++;
            const parsedTest = this.parseTest(suite, test, testCount);
            if (parsedTest) {
                const currentTestDescription = parsedTest.description;
                if (testNames[currentTestDescription]) {
                    testNames[currentTestDescription] = testNames[currentTestDescription] + 1;
                    parsedTest.description = currentTestDescription + " (" + testNames[currentTestDescription] + ")";
                } else {
                    testNames[currentTestDescription] = 1;
                }
                tests.push(parsedTest);
            }
        }

        return tests;
    }

    /**
     * Parses a single test of the yaml test file
     * @param {TestSuite} suite - the complete test suite
     * @param {object} rawTest - a single raw test from the yaml file
     * @param {number} testIndex - the index of which test we are parsing
     * @return {Test}
     */
    parseTest(suite, rawTest, testIndex) {
        //If this is not an array, skip it
        if (!Array.isArray(rawTest)) {
            return undefined;
        }

        // The rawTest element is just an array of interactions
        // Optionally preceded by metadata about the test
        let rawInteractions = rawTest;
        if (rawInteractions.length == 0) {
            return new Test(suite, undefined, []);
        }

        // We need to pull out the first key of the first line of the test
        // If there is any metadata, this is where it is

        let testMeta = "Test " + testIndex;
        let only = false;
        let skipped = false;
        let tags = [];
        const filteredInteractions = [];

        for (let i = 0; i < rawInteractions.length; i++) {
            let isSpecialInteraction = false;

            const currentInteraction = rawInteractions[i];

            const interactionKeys = Object.keys(currentInteraction);

            // If the first or second element of the first interaction is "test", "test.only", or "test.skip", it is metadata
            if (i < 2 && interactionKeys.length > 0 && ["test", "test.only", "test.skip"].includes(interactionKeys[0])) {
                isSpecialInteraction = true;
                testMeta = currentInteraction[interactionKeys[0]];
                if (interactionKeys[0] === "test.only") {
                    only = true;
                } else if (interactionKeys[0] === "test.skip") {
                    skipped = true;
                }
            }

            // If the first or second element of the first interaction is "tag", it is metadata
            if (i < 2 && interactionKeys.length > 0 && ["tags"].includes(interactionKeys[0])) {
                isSpecialInteraction = true;

                const tagsString = currentInteraction[interactionKeys[0]];
                if (Util.isString(tagsString)) {
                    tags = tagsString.split(",").map(tag => tag.trim());
                }
            }

            if (!isSpecialInteraction) {
                filteredInteractions.push(currentInteraction);
            }
        }

        const test = new Test(suite, testMeta, []);
        test.index = testIndex - 1;
        for (let i = 0; i < filteredInteractions.length; i++) {
            let rawInteraction = filteredInteractions[i];
            test.interactions.push(this.parseInteraction(test, rawInteraction, i));
        }

        test.skip = skipped;
        test.only = only;

        if (tags.length) {
            test.tags = tags;
        }

        test.validate();
        return test;
    }

    /**
     * Parse a single interaction
     * @param {Test} test - the Test the contains the interaction being parsed
     * @param {object|string} interactionJSON - the interaction being parsed
     * @param {number} index - the index of the interaction in the test
     * @return {TestInteraction}
     */
    parseInteraction(test, interactionJSON, index) {
        const interaction = new TestInteraction(test);

        // If we have an object, we process it - alternatively the interaction could just be a string
        //  Such as "- yes" without any assertions        
        if (Util.isObject(interactionJSON)) {
            interaction.utterance = Object.keys(interactionJSON)[0];
            const elements = interactionJSON[interaction.utterance];
            interaction.lineNumber = Util.extractLine(elements);
            // Just because we have an object, we might have a "bad" object
            // Like so: - yes: "okay" - our old-style syntax
            // We just ignore these cases for now
            if (Array.isArray(elements)) {
                for (const element of elements) {
                    if (Util.isValueType(element)) {
                        const { assertion } = this.parseStringAssertion(interaction, element);
                        if (assertion) {
                            interaction.assertions.push(assertion);
                        }
                    } else {
                        if (element.intent) {
                            interaction.intent = element.intent.valueOf();

                            // Treat any other keys as slots
                            const slots = Util.cleanObject(element);
                            delete slots.intent;
                            interaction.slots = slots;
                        } else if (element.slots) {
                            interaction.slots = Util.cleanObject(element.slots);
                        } else if (element.label) {
                            interaction.label = Util.cleanObject(element.label);
                        } else if (Expression.isExpression(element)) {
                            interaction.expressions.push(new Expression(element));
                        } else {
                            // Must be an assertion otherwise
                            interaction.assertions.push(this.parseObjectAssertion(interaction, element));
                        }
                    }
                }
            } else if (elements) {
                let operator = "==";
                if (Util.isString(elements) && elements.startsWith("/")) {
                    operator = "=~";
                }
                interaction.assertions.push(
                    new Assertion(interaction, "prompt", operator, elements, this.getDefinedVariables(elements), ":"));
            }
        } else {
            const { utterance, assertion } = this.parseStringAssertion(interaction, interactionJSON, true);
            interaction.utterance = utterance;
            interaction.lineNumber = Util.extractLine(interactionJSON);
            if (assertion) {
                interaction.assertions.push(assertion);
            }
        }
        interaction.relativeIndex = index;
        return interaction;
    }

    /**
     * Parses a single Assertion inside an interaction
     * @param {TestInteraction} interaction - the interaction where this assertion is used
     * @param {object} element - the object representation of the YAML element
     * @return {Assertions}
     */
    parseObjectAssertion(interaction, element) {
        // Should have just one key
        const path = Object.keys(element)[0];
        const value = element[path];
        let operator = "==";
        // If the value starts with /, then it must be regular expression
        if (Util.isString(value) && value.trim().startsWith("/")) {
            operator = "=~";
        } else if (Array.isArray(value)) {
            if (value.some(x => Util.isString(x) && (x.trim().startsWith("/")))) {
                operator = "=~";
            }
        }

        let variablesMerged = [];

        const values = [];
        if (Array.isArray(value)) {
            for (const element of value) {
                values.push(element);
            }
            variablesMerged = values.reduce((variables, singleValue) => {
                const extractedVariables = this.getDefinedVariables(singleValue);
                return variables.concat(extractedVariables);
            }, []);

        } else {
            variablesMerged = this.getDefinedVariables(value + "");
        }

        const assertion = new Assertion(interaction, path, operator, value, _.uniq(variablesMerged), ":");
        assertion.validate();
        assertion.lineNumber = Util.extractLine(value);
        return assertion;
    }

    /**
     * Parse a string into assertion object.
     * Our short syntax is not valid in YAML. We look for an operator inside the string
     * Examples:
     * Hi
     * exit
     * LaunchRequest != hi
     * cardTitle != hi
     * cardTitle != - Value1 - Value2 - Value2
     *
     * @param {TestInteraction} interaction - the interaction that includes this assertion
     * @param {string} assertionString - the assertion as a string
     * @param {boolean} isUtteranceIncluded - if isUtteranceIncluded is set to true, the first part of the string will
     * will be considered as an utterance
     * @return {Assertion}
     */
    parseStringAssertion(interaction, assertionString, isUtteranceIncluded = false) {
        let path;
        let operator;
        let value;
        let utterance = undefined;
        let assertion = undefined;

        if (typeof assertionString === "number") {
            assertionString = assertionString + "";
        }
        // Special handling for exit
        if (assertionString.trim() === "exit") {
            return { assertion: new Assertion(interaction, "exit") };
        }

        // if utterance is not included, string with empty spaces is invalid 
        if (!isUtteranceIncluded && assertionString.indexOf(" ") === -1) {
            throw ParserError.interactionError(interaction,
                "Invalid assertion: " + assertionString,
                Util.extractLine(assertionString));
        }

        operator = this.getOperator(assertionString, isUtteranceIncluded);

        if (operator) {
            const parts = assertionString.split(operator);
            path = isUtteranceIncluded ? "prompt" : parts[0].trim(); // if utterance include, path set to prompt
            utterance = isUtteranceIncluded ? parts[0].trim() : undefined;
            value = parts[1].trim();
            operator = operator.trim();

            // YAML collections get parsed as string when using our operators
            // Ex: - Value1 - Value2 - Value2
            // checking if is a collection 
            const missingParsedCollection = value.split("-").map(x => x.trim()).filter(x => x);
            if (missingParsedCollection.length > 1) {
                value = missingParsedCollection;
            }
        } else {
            utterance = assertionString;
        }

        if (operator) {
            // We only look for variables in the values (not the path)
            const variables = this.getDefinedVariables(value + "");
            assertion = new Assertion(interaction, path, operator, value, variables, operator);
            assertion.lineNumber = Util.extractLine(assertionString);
            assertion.validate();
        }

        return { assertion, utterance };
    }

    /**
     * returns the operator used inside the assertion
     * @param {string} assertionString - the assertion as a string
     * @param {boolean} isUtteranceIncluded - if isUtteranceIncluded is set to true, the first part of the string will
     * be considered as an utterance
     * @return {string}
     */
    getOperator(assertionString, isUtteranceIncluded) {
        const operators = [" == ", " =~ ", " != ", " >= ", " <= ", " > ", " < "];
        let operatorPosition = -1;
        let operator = undefined;
        for (let i = 0; i < operators.length; i++) {
            operatorPosition = assertionString.indexOf(operators[i]);
            if (operatorPosition > -1) {
                operator = operators[i];
                break;
            }
        }

        // if we don't find our operators, we will search for invalid ones
        // assertion object will validate the invalid ones
        // only applies when the utterance is not included
        if (!operator && !isUtteranceIncluded) {
            const parts = assertionString.split(/ +/);
            operator = parts[1];
        }

        return operator;
    }

    /**
     * Replaces constants set in the configuration which the actual values
     * @param {string} script - the yaml file as a string
     * @return {string}
     */
    findReplace(script, configurationOverride = {}) {
        let findReplaceMap = {};

        if (isEmpty(get(configurationOverride, 'findReplace'))) {
            findReplaceMap = Configuration.instance() && Configuration.instance().findReplaceMap();
        } else {
            findReplaceMap = get(configurationOverride, 'findReplace', {})
        }

        if (!findReplaceMap) return script;
        for (const find of Object.keys(findReplaceMap)) {
            const value = findReplaceMap[find];
            script = script.split(find).join(value);
        }
        return script;
    }

    /**
     * Gets the different variables that needs to be replaced
     * @param {string} assertion - the yaml file as a string
     * @return {string[]} the defined variables
     */
    getDefinedVariables(originalAssertion) {
        const variables = [];
        // cloning the assertion to ensure we are not mutating it inside
        let assertion = originalAssertion + "";
        let startIndex = -1;
        do {
            startIndex = assertion.indexOf("{");
            if (startIndex !== -1) {
                const endIndex = assertion.indexOf("}", startIndex);
                variables.push(assertion.substring(startIndex + 1, endIndex));
                assertion = assertion.substring(endIndex + 1).trim();
            }
        } while (startIndex !== -1);

        if (variables.length) {
            return _.uniq(variables);
        }

        return [];

    }

    /**
     * validate if ivr test are valid,
     * this method should be called after global configuration is load
     * @param {testSuite} suite - test suite will all the tests
     */
    validateIvrTests(suite) {
        const platform = suite.platform;
        if (platform === "twilio" || platform === "phone") {
            const tests = suite.tests;
            for (let i = 0; i < tests.length; i++) {
                const test = tests[i];
                for (let j = 0; j < test.interactions.length; j++) {
                    const interaction = test.interactions[j];
                    const hasFinishOnPhrase = interaction.expressions.some(e => e.path.includes("finishOnPhrase"));
                    const hasListeningTimeout = interaction.expressions.some(e => e.path.includes("listeningTimeout"));
                    const hasPrompt = interaction.assertions && interaction.assertions.length > 0;
                    const isValid = hasPrompt || hasFinishOnPhrase || hasListeningTimeout;
                    if (j < test.interactions.length - 1 && !isValid) {
                        throw ParserError.error(suite.fileName,
                            "missing required parameter 'transcript', 'finishOnPhrase' or 'listeningTimeout'",
                            interaction.lineNumber);
                    }
                }
            }
        }
    }
}

module.exports = TestParser;

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

module.exports = class TestParser {
    constructor(fileName) {
        this.fileName = fileName;
        if (this.fileName) {
            this.contents = fs.readFileSync(this.fileName, "utf8");
        }
    }

    load(contents) {
        this.contents = contents;
    }

    // Parses a test file and returns a test suite
    parse() {
        try {
            const contents = this.findReplace(this.contents);
            const documents = yaml.loadAll(contents);
            let configuration;
            let tests = documents;
            if (documents.length > 1 && documents[0].configuration) {
                if (!Util.isObject(documents[0].configuration)) {
                    throw ParserError.globalError(this.fileName,
                        "Configuration element is not an object",
                        Util.extractLine(documents[0].configuration));
                }
                configuration = documents[0].configuration;
                tests = documents.slice(1);
            }

            const suite = new TestSuite(this.fileName, configuration);
            suite.tests = this.parseTests(suite, tests);
            suite.rawTestContent = this.contents;
            return suite;
        } catch (e) {
            throw e;
        }
    }

    parseTests(suite, rawTests) {
        const tests = [];
        let testCount = 0;
        for (const test of rawTests) {
            testCount++;
            const parsedTest = this.parseTest(suite, test, testCount);
            if (parsedTest) {
                tests.push(parsedTest);
            }
        }

        return tests;
    }

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

        for (let i=0; i < rawInteractions.length; i++) {
            let isSpecialInteraction = false;

            const currentInteraction = rawInteractions[i];

            const interactionKeys =  Object.keys(currentInteraction);
            
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
        for(let i=0; i<filteredInteractions.length; i++){
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
                        interaction.assertions.push(this.parseStringAssertion(interaction, element));
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
                interaction.assertions.push(new Assertion(interaction, "prompt", operator, elements));
            }
        } else {
            const { utter, assertion } = this.parseStringUtterAssertion(interaction, interactionJSON);
            interaction.utterance = utter;
            interaction.lineNumber = Util.extractLine(interactionJSON);
            if (assertion) {
                interaction.assertions.push(assertion);
            }
        }
        interaction.relativeIndex = index;
        return interaction;
    }

    parseObjectAssertion(interaction, element) {
        // Should have just one key
        const path = Object.keys(element)[0];
        const value = element[path];
        let operator = "==";
        // If the value starts with /, then it must be regular expression
        if (Util.isString(value) && value.trim().startsWith("/")) {
            operator = "=~";
        }

        const assertion = new Assertion(interaction, path, operator, value);
        assertion.validate();
        assertion.lineNumber = Util.extractLine(value);
        return assertion;
    }

    parseStringAssertion(interaction, assertionString) {
        let path;
        let operator;
        let value;

        // Special handling for exit
        if (assertionString.trim() === "exit") {
            return new Assertion(interaction, "exit");
        }

        if (assertionString.indexOf(" ") === -1) {
            throw ParserError.interactionError(interaction,
                "Invalid assertion: " + assertionString,
                Util.extractLine(assertionString));
        }

        const parts = assertionString.split(/ +/);
        path = parts[0];
        operator = parts[1];
        value = parts.slice(2).join(" ");
        const missingParsedCollecion = value.split("-").map(x => x.trim()).filter(x => x);
        if (missingParsedCollecion.length > 1) {
            value = missingParsedCollecion;
        }
        
        const assertion = new Assertion(interaction, path, operator, value);
        assertion.lineNumber = Util.extractLine(assertionString);
        assertion.validate();
        return assertion;
    }

    parseStringUtterAssertion(interaction, utterAssertionString) {
        const operators = ["==", "=~", "!=", ">=", "<=", ">", "<"];
        const path = "prompt";
        let utter;
        let operator;
        let value;
        let operatorPosition = 0;
        let assertion;
        for (let i=0; i<operators.length; i++){
            operatorPosition = utterAssertionString.indexOf(operators[i]);
            if (operatorPosition > -1) {
                operator = operators[i];
                break;
            }
        }

        if (operator) {
            const parts = utterAssertionString.split(operator);
            utter = parts[0];
            value = parts[1];

            assertion = new Assertion(interaction, path, operator, value);
            assertion.lineNumber = Util.extractLine(utterAssertionString);
            assertion.validate();
        } else {
            utter = utterAssertionString;
        }

        return { utter, assertion };
    }

    findReplace(script) {
        const findReplaceMap = Configuration.instance() && Configuration.instance().findReplaceMap();
        if (!findReplaceMap) return script;
        for (const find of Object.keys(findReplaceMap)) {
            const value = findReplaceMap[find];
            script = script.split(find).join(value);
        }
        return script;
    }
};
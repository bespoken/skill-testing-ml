const Assertion = require("./Assertion");
const Expression = require("./Expression");
const fs = require("fs");
const ParserError = require("./ParserError");
const Test = require("./Test");
const TestInteraction = require("./TestInteraction");
const TestSuite = require("./TestSuite");
const Util = require("./Util");
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
            const documents = yaml.loadAll(this.contents);
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

        let testMeta;
        // The rawTest element is just an array of interactions
        // Optionally preceded by metadata about the test
        let rawInteractions = rawTest;
        if (rawInteractions[0] && rawInteractions[0].test) {
            testMeta = rawInteractions[0].test;
            rawInteractions = rawInteractions.slice(1);
        } else {
            testMeta = "Test " + testIndex;
        }

        const test = new Test(suite, testMeta, []);
        for (const rawInteraction of rawInteractions) {
            test.interactions.push(this.parseInteraction(test, rawInteraction));
        }

        test.validate();
        return test;
    }

    parseInteraction(test, interactionJSON) {
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
                        } else if (element.slots) {
                            interaction.slots = Util.cleanObject(element.slots);
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
            interaction.utterance = interactionJSON;
            interaction.lineNumber = Util.extractLine(interactionJSON);
        }

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

        const assertion = new Assertion(interaction, path, operator, value);
        assertion.lineNumber = Util.extractLine(assertionString);
        assertion.validate();
        return assertion;
    }
}
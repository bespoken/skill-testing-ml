const _ = require("lodash");
const Assertion = require("./Assertion");
const fs = require("fs");
const Expression = require("./Expression");
const Test = require("./Test");
const TestInteraction = require("./TestInteraction");
const TestSuite = require("./TestSuite");
const yaml = require("js-yaml");

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
                configuration = documents[0].configuration;
                tests = documents.slice(1);
            }

            const testArray = this.parseTests(tests);
            return new TestSuite(this.fileName, configuration, testArray);
        } catch (e) {
            throw e;
        }
    }

    parseTests(rawTests) {
        const tests = [];
        let testCount = 0;
        for (const test of rawTests) {
            testCount++;
            tests.push(this.parseTest(test, testCount));
        }
        return tests;
    }

    parseTest(rawTest, testIndex) {
        let testMeta;
        // The rawTest element is just an array of interactions
        // Optionally preceded by metadata about the test
        let rawInteractions = rawTest;
        if (rawInteractions[0].test) {
            testMeta = rawInteractions[0].test;
            rawInteractions = rawInteractions.slice(1);
        } else {
            testMeta = "Test " + testIndex;
        }

        const interactions = [];
        for (const rawInteraction of rawInteractions) {
            try {
                interactions.push(this.parseInteraction(rawInteraction));
            } catch (e) {
                let message = "SyntaxError: " + e.message;
                if (testMeta) {
                    message += "\nTest: " + testMeta;
                }
                message += "\nInteraction: " + rawInteraction.utterance;
                throw Error(message);
            }
        }
        const test = new Test(testMeta, interactions);
        return test;
    }

    parseInteraction(interaction) {
        // An interaction is just a collection of setup objects and assertions
        let intent;
        const requestExpressions = [];
        let slots;
        const assertions = [];
        // The interaction should have just a single key, which is the name of the utterance
        // (which may also be a request type)
        let utterance = null;

        // If we have an object, we process it - alternatively the interaction could just be a string
        //  Such as "- yes" without any assertions
        if (_.isObject(interaction)) {
            utterance = Object.keys(interaction)[0];
            const elements = interaction[utterance];
            // Just because we have an object, we might have a "bad" object
            // Like so: - yes: "okay" - our old-style syntax
            // We just ignore these cases for now
            if (Array.isArray(elements)) {
                for (const element of elements) {
                    if (_.isObject(element)) {
                        if (element.intent) {
                            intent = element.intent;
                        } else if (element.slots) {
                            slots = element.slots;
                        } else if (Expression.isExpression(element)) {
                            requestExpressions.push(new Expression(element));
                        } else {
                            // Must be an assertion otherwise
                            assertions.push(this.parseObjectAssertion(element));
                        }
                    } else if (typeof element === "string") {
                        assertions.push(this.parseStringAssertion(element));
                    }
                }
            }
        } else {
            utterance = interaction;
        }

        return new TestInteraction(utterance, intent, slots, requestExpressions, assertions);
    }

    parseObjectAssertion(element) {
        // Should have just one key
        const path = Object.keys(element)[0];
        const value = element[path];
        let operator = "==";
        // If the value starts with /, then it must be regular expression
        if (typeof value === "string" && value.trim().startsWith("/")) {
            operator = "=~";
        }

        const assertion = new Assertion(path, operator, value);
        assertion.validate();
        return assertion;
    }

    parseStringAssertion(assertionString) {
        let path;
        let operator;
        let value;

        const parts = assertionString.split(/ +/);
        path = parts[0];
        operator = parts[1];
        value = parts.slice(2).join(" ");

        const assertion = new Assertion(path, operator, value);
        assertion.validate();
        return assertion;
    }
}
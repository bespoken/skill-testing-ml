const _ = require("lodash");
const Assertion = require("./Assertion");
const fs = require("fs");
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
        for (const test of rawTests) {
            tests.push(this.parseTest(test));
        }
        return tests;
    }

    parseTest(rawTest) {
        let testMeta;
        // The rawTest element is just an array of interactions
        // Optionally preceded by metadata about the test
        let rawInteractions = rawTest;
        if (rawInteractions[0].test) {
            testMeta = rawInteractions[0].test;
            rawInteractions = rawInteractions.slice(1);
        }

        const interactions = [];
        for (const rawInteraction of rawInteractions) {
            interactions.push(this.parseInteraction(rawInteraction));
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
        const utterance = Object.keys(interaction)[0];
        const elements = interaction[utterance];
        for (const element of elements) {
            if (_.isObject(element)) {
                if (element.intent) {
                    intent = element.intent;
                } else if (element.slots) {
                    slots = element.slots;
                }
            } else if (typeof element === "string") {
                if (element.startsWith("request")) {
                    requestExpressions.push(element);
                } else {
                    assertions.push(this.parseAssertion(element));
                }

            }
        }
        return new TestInteraction(utterance, intent, slots, requestExpressions, assertions);
    }

    parseAssertion(assertionString) {
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
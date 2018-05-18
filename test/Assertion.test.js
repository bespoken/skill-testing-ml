const Assertion = require("../lib/Assertion");

describe("assertion", () => {
    test("evaluate == a string", () => {
        const obj = { val: "Here is a test" };
        let assertion = new Assertion("val", "==", "Here is a test");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", "\"Here is a test\"");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", "Here it will fail");
        expect(assertion.evaluate(obj)).toBe(false);

        const assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [val] to ==\n");
        expect(assertionString).toContain("\tHere it will fail\n");
    });

    test("evaluate regex", () => {
        const obj = { val: "Here is a test" };
        let assertion = new Assertion("val", "=~", "/.*/");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "=~", "/here is a test/i");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "=~", "/here is a test/");
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion("val", "=~", ".*");
        expect(assertion.evaluate(obj)).toBe(true);
    });

    test("evaluate array", () => {
        const obj = { val: "Here is a test +" };
        let assertion = new Assertion("val", "=~", ["/.*/", "not a test"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", ["/Not here.*/", "Here is a test +"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", ["/.*/", "Here does not match"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", ["Not match", "Here does not match"]);
        expect(assertion.evaluate(obj)).toBe(false);
        const assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [val] to be one of:\n");
        expect(assertionString).toContain("\tNot match\n\tHere does not match\n");
    });

    test("evaluate numeric operators", () => {
        const obj = {
            notNumber: "notNumber",
            number: 100,
            numberString: "100"
        };

        // Core operator tests
        let assertion = new Assertion("number", ">", 99);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("number", ">", 100);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion("number", ">=", 100);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("number", ">=", 101);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion("number", "<=", 100);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("number", "<=", 99);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion("number", "<", 101);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("number", "<", 100);
        expect(assertion.evaluate(obj)).toBe(false);

        // Check some edge cases
        assertion = new Assertion("number", ">", "50");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("numberString", ">", "50");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("notNumber", ">", "50");
        expect(assertion.evaluate(obj)).toBe(false);
        const assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [notNumber] to be >\n");
    });

    test("evaluate wild cards", () => {
        const obj = { val: "Here $ is ^ a + test?" };
        let assertion = new Assertion("val", "==", "Here $ is ^ a + *");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", "Here is");
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion("val", "==", "Here $ is *?");
        expect(assertion.evaluate(obj)).toBe(true);
    });

    test("evaluate == undefined", () => {
        const obj = { val: undefined, val2: "a" };
        let assertion = new Assertion("val", "==", "undefined");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "==", undefined);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val2", "==", undefined);
        expect(assertion.evaluate(obj)).toBe(false);
    });

    test("evaluate != undefined", () => {
        const obj = { val: undefined, val2: "a" };
        let assertion = new Assertion("val2", "!=", "undefined");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val2", "!=", undefined);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion("val", "!=", undefined);
        expect(assertion.evaluate(obj)).toBe(false);
    });
});
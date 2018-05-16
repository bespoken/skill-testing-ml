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
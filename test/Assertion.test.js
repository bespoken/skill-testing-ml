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
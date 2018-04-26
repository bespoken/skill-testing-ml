const Assertion = require("../lib/Assertion");

describe("assertion", () => {
    test("evaluate", () => {
        const obj = { val: "Here is a test" };
        const assertion = new Assertion("val", "==", "\"Here is a test\"");
        expect(assertion.evaluate(obj)).toBe(true);

    });
});
const Assertion = require("../lib/test/Assertion");
const InvokerResponse = require("../lib/runner/Invoker").InvokerResponse;

describe("assertion", () => {
    test("evaluate == a string", () => {
        const obj = new MockResponse({ val: "Here is a test" });
        let assertion = new Assertion(undefined, "val", "==", "Here is a test");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", "\"Here is a test\"");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", "Here  is a   test!?", [], "==", true);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", "Here  is a   test!?");
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "val", "==", "Here it will fail");
        expect(assertion.evaluate(obj)).toBe(false);

        const assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [val] to ==\n");
        expect(assertionString).toContain("\tHere it will fail\n");
    });

    test("evaluate regex", () => {
        let obj = new MockResponse({ val: "Here is a test" });
        let assertion = new Assertion(undefined, "val", "=~", "/.*/");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "=~", "/here is a test/i");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "=~", "/here is a test/");
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "val", "=~", ".*");
        expect(assertion.evaluate(obj)).toBe(true);

        obj = new MockResponse({ val: "1980" });
        assertion = new Assertion(undefined, "val", "=~", "\\d+");
        expect(assertion.evaluate(obj)).toBe(true);

        obj = new MockResponse({ val: "word" });
        assertion = new Assertion(undefined, "val", "=~", "\\w+");
        expect(assertion.evaluate(obj)).toBe(true);

        obj = new MockResponse({ val: "welcome to guess" });
        assertion = new Assertion(undefined, "val", "=~", "\\d+");
        expect(assertion.evaluate(obj)).toBe(false);
    });

    test("evaluate array", () => {
        const obj = new MockResponse({ val: "Here is a test +" });
        let assertion = new Assertion(undefined, "val", "=~", ["/.*/", "not a test"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", ["/Not here.*/", "Here is a test +"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", ["Here is", "Here does not match"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", ["Not match", "Here does not match"]);
        expect(assertion.evaluate(obj)).toBe(false);
        let assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [val] to be one of:\n");
        expect(assertionString).toContain("\tNot match\n\tHere does not match\n");

        assertion = new Assertion(undefined, "val", "!=", ["not match", "not match 2"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "!=", ["Here is", "Here does not match"]);
        expect(assertion.evaluate(obj)).toBe(false);
        assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [val] to be one of:\n");
        expect(assertionString).toContain("\tHere is\n\tHere does not match\n");        
    });

    test("evaluate numeric operators", () => {
        const obj = new MockResponse({
            notNumber: "notNumber",
            number: 100,
            numberString: "100",
        });

        // Core operator tests
        let assertion = new Assertion(undefined, "number", ">", 99);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "number", ">", 100);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "number", ">=", 100);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "number", ">=", 101);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "number", "<=", 100);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "number", "<=", 99);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "number", "<", 101);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "number", "<", 100);
        expect(assertion.evaluate(obj)).toBe(false);

        // Check some edge cases
        assertion = new Assertion(undefined, "number", ">", "50");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "numberString", ">", "50");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "notNumber", ">", "50");
        expect(assertion.evaluate(obj)).toBe(false);
        const assertionString = assertion.toString(obj);
        expect(assertionString).toContain("Expected value at [notNumber] to be >\n");
    });

    test("evaluate wild cards", () => {
        const obj = new MockResponse({ val: "Here $ is ^ a + test?" });
        let assertion = new Assertion(undefined, "val", "==", "Here $ is ^ a + *");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", "Here is");
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "val", "==", "Here $ is *?");
        expect(assertion.evaluate(obj)).toBe(true);
    });

    test("evaluate == undefined", () => {
        const obj = new MockResponse({ val: undefined, val2: "a" });
        let assertion = new Assertion(undefined, "val", "==", "undefined");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "==", undefined);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val2", "==", undefined);
        expect(assertion.evaluate(obj)).toBe(false);
    });

    test("evaluate != undefined", () => {
        const obj = new MockResponse({ val: undefined, val2: "a" });
        let assertion = new Assertion(undefined, "val2", "!=", "undefined");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val3", "!=", "z");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val2", "!=", undefined);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val", "!=", undefined);
        expect(assertion.evaluate(obj)).toBe(false);

        assertion = new Assertion(undefined, "val2", "!=", ["x", "y", "z"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val3", "!=", ["x", "y", "z"]);
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "val2", "!=", undefined);
        expect(assertion.evaluate(obj)).toBe(true);
    });

    test("ignore case on string assertions", () => {
        const obj = new MockResponse({ ignoreCase: "TeSt2" });
        let assertion = new Assertion(undefined, "ignoreCase", "==", "test2");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "ignoreCase", "==", "TEST2");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "ignoreCase", "=~", "/TEST2/");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "ignoreCase", "=~", "/TEST2/g");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "ignoreCase", "=~", "/.*/g");
        expect(assertion.evaluate(obj)).toBe(true);

        assertion = new Assertion(undefined, "ignoreCase", "=~", "/ABC/g");
        expect(assertion.evaluate(obj)).toBe(false);
    });

    test("invalid operator", () => {
        const obj = new MockResponse({ val: "Here is a test" });
        let assertion = new Assertion(undefined, "val", "=!", "Here is a test");
        try {
            assertion.evaluate(obj);
            expect(true).toBe(false);
        } catch (error) {
            expect(true).toBe(true);
        }

    });

    describe("toString", () => {
        test("display error", () => {
            const json = { val: "Here is a test" };
            const assertion = new Assertion(undefined, "val", "==", "Here is a test");
            let errorObj = "This is an error";
            expect(assertion.toString(json, errorObj)).toBe("This is an error");
        });
    });

});

class MockResponse extends InvokerResponse {
    constructor(sourceJSON) {
        super(undefined, sourceJSON);
    }

    ignoreCase(path) {
        if (path === "ignoreCase") {
            return true;
        }
        return false;
    }
}
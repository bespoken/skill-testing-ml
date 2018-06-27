# Test Parser

## Overview 

Parse a [yml file](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit#heading=h.9dwsxj6quakr) into a test object.

## How to use it

Create a TestParser using the path of the yml file.

```
const TestParser = require('skill-testing-ml').TestParser;
const parser = new TestParser("en-US/edgar.yml");

```

Call the parse method, if the file is valid an object will be created, if not an exception will be through with the error.

```
parser.parse();
```

Error example:
```
Error - YAMLException:
end of the stream or a document separator is expected at line 17, column 14:
    configuration:

```


# Test Runner

## Overview
Test Runner allows to execute tests using [SkillTestingMarkupLanguage](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit#heading=h.9dwsxj6quakr).

## How to used it

Create a TestRunner instance with the required configuration.

```
const TestRunner = require('skill-testing-ml').TestRunner;

const runner = new TestRunner({
    invoker: "virtualDeviceInvoker",
});

```

Call run method using the file path and a context object, context object will be sent back as part of the event.
```
await runner.run("fact-skill-tests.yml", context);

```


TestRunner will emit events before and after each testcase of the file, use subsribe method to add callbacks and listen for the events. "message" event will be fired before the execution and "result" after that. 

```
const messageCallback = (error, test, context) => {};
const resultCallback = (error, test, context) => {};

runner.subscribe("message", messageCallback);
runner.subscribe("result", resultCallback);

```

Error parameter will contain errors of the execution, will be undefined if everything is fine.


Test parameter will contain the test itself, will have this structure
```
{
    description: "" // Test's name,
    status: "", // Test's status: "running" or "done"
    interactions: [ // List of test's interactions
        {
            assertions: [ // Assertions list of current utter
                ""
            ],
            expressions: [
            ],
            lineNumber: "", // Line number of the test
            utterance: "" // utter tested
        }
    ],
    interactionResults: [ // List of result of all the interactions
        {
            passed: true
        }
    ]
}

// Example

{
    "description":"Sequence 02. Test scenario: Invoke intent adding items in different interaction",
    "interactions":[
        {
            "assertions":["Expected value at [prompt] to ==\n\t*\nReceived:\n\tundefined\n"],
            "expressions":[],
            "lineNumber":28,
            "utterance":"open bring"
        },{
            "assertions":["Expected value at [prompt] to ==\n\tok* cheese and wine is on your *\nReceived:\n\tundefined\n"],
            "expressions":[],
            "lineNumber":29,
            "utterance":"add cheese and wine"
        },
        {
            "assertions":["Expected value at [prompt] to ==\n\tyou have * cheese and wine * apples and oranges *\nReceived:\n\tundefined\n"],
            "expressions":[],
            "lineNumber":30,
            "utterance":"read my list"
        }
    ],
    "status":"done",
    "interactionResults":[
        {"passed":true},
        {"passed":true},
        {"errorMessage":"Expected value at [prompt] to ==\n\tyou have * cheese and wine * apples and oranges *\nReceived:\n\tyou have the following items on your list milk apples and oranges and cheese and wine what's next\n","exited":false,"passed":false}
    ]
}

```
Context parameter will contain the same object sent on run.

## 




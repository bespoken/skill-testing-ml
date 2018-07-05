# Test Parser

## Overview 

Parse a [yml file](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit#heading=h.9dwsxj6quakr) into a test object.

## How to use it

Create a TestParser using the path of the yml file.

```
const TestParser = require('skill-testing-ml').TestParser;
const parser = new TestParser("en-US/edgar.yml");

```

Call the parse method, if the file is valid a testSuite object will be created, if not an exception will be through with the error.

```
const testSuite = parser.parse();
```

The exception will have details of the error, even the line and column of the error.

Error example:
```
{
    name: "YAMLException",
    reason: "end of the stream or a document separator is expected",
    mark: {
        position: 826,
        line: 16,
        column: 13,
    },
    message: "end of the stream or a document separator is expected at line 17, column 14:\n    configuration:\n",
}

```


# Test Runner

## Overview
Test Runner allows to execute tests using [SkillTestingMarkupLanguage](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit#heading=h.9dwsxj6quakr).

## How to use it

Create a TestRunner instance with the required configuration.

```
const TestRunner = require('skill-testing-ml').TestRunner;

const runner = new TestRunner({
    invoker: "virtualDeviceInvoker",
    batchEnabled: false, # Use this configuration to receive events per interaction, otherwise will be per test case.
});

```

TestRunner will emit events before and after each test interaction is run in the file, use subscribe method to add callbacks and listen for the events. "message" event will be fired before each interaction, and result will be sent back after each reply. 

```
const messageCallback = (error, test, context) => {};
const resultCallback = (error, test, context) => {};

runner.subscribe("message", messageCallback);
runner.subscribe("result", resultCallback);

```


Call runSuite method using the testSuite object created with the parser, context object will be sent back as part of the event.

```
await runner.runSuite(testSuite, context);

```

Run method can also be used, the path of the yml file should be used as paramenter.
```
await runner.run("fact-skill-tests.yml", context);

```


Error parameter will contain errors of the execution, will be undefined if everything is fine.


Test parameter will contain the test itself, will have this structure
```
{
    assertions: [ // Assertions list of current utter
        ""
    ],
    expressions: [
    ],
    lineNumber: "", // Line number of the test
    utterance: "", // utter tested
    result: {
        passed: true, // result of the interaction
        errorMessage: "", // error message if there is an error
    }
}

// Example passed: true

{
    "assertions":["Expected value at [prompt] to ==\n\t*\nReceived:\n\tundefined\n"],
    "expressions":[],
    "lineNumber":28,
    "utterance":"open bring",
    "result": {
        "passed": true
    }
}

// Example passed: false

{
    "assertions":[],
    "expressions":[],
    "lineNumber":8,
    "utterance":"Hi",
    "result": {
        "errorMessage": "Unable to match utterance: Hi to an intent. Try a different utterance, or explicitly set the intent\nat test/FactSkill/fact-skill-tests.yml:8:0",
        "passed": false
    }
}

```
Context parameter will contain the same object sent on run.

## 




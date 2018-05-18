# Complete Skill Testing Guide

* [Overview](#overview)
    * [Nota Bene](#nota-bene)
* [Configuration](#configuration)
* [CLI Options](#cli-options)
* [Test Structure](#test-structure)
    * [Test Suites](#test-suites)
    * [Test Configuration](#test-configuration)
    * [Test Structure](#test-structure)
    * [Assertions](#assertions)
        * [JSONPath Properties](#jsonpath-properties)
        * [Shorthand Properties](#shorthand-properties)
        * [Regular Expression Values](#regular-expression-values)
        * [Collection Values](#collection-values)
    * [Request Expressions](#request-expressions)
    * [Goto and Exit](#goto-and-exit)
* [Further Reading](#further-reading)

## Overview
The purpose of the Skill Testing Markup Language is to make it easy for anyone to test Alexa skills and voice apps.

The syntax is based on YAML, and is meant to be easy to read and write. [Learn more about YAML syntax here](http://yaml.org/spec/1.2/spec.html#Preview).

The tests are actually run with specialized version of Jest.
Jest is an excellent testing tool, that combines unit tests, code coverage, easy-to-use mocks and other nice features in one place.
[Learn more here](https://facebook.github.io/jest/).

Jest has been configured with a custom test runner, which:
* Works with YAML files, fitting the structure described here
* Runs using our [Virtual Alexa component](https://github.com/bespoken/virtual-alexa) to generate JSON requests and emulate Alexa behavior

We consider this the best of all worlds - a full-featured general testing framework tailored to work specifically with skills.

### Nota Bene
**KEEP IN MIND** the skill tester uses Virtual Alexa, which is an emulator. It is not the real Alexa. This has some benefits, such as:

* Fast execution time
* No need for deployment to run
* Minimal dependencies, and with builtin mocks that are useful

But there are also limitations. Those include:

* It does not have real speech recognition - turning utterances into intents is done with simple heuristics
* It cannot call the actual Alexa APIs, such as the Address API, because it does not generate a proper apiAccessToken
* It is emulating Alexa, and may do it imperfectly at times (and let us know if you see any issues)

If you run into issues with testing specific utterances, always keep in mind you can set the exact intent and slot values with the intent and slot properties.

## Configuration
Global configuration options for testing skills can be set in the file

These options can include overriding Jest options, as well as setting skill testing specific ones.

The default Jest settings are as follows:
```
{
    "collectCoverage": true,
    "collectCoverageFrom": [
        "**/*.js",
        "!**/coverage/**",
        "!**/node_modules/**",
        "!**/vendor/**"
    ],
    "coverageDirectory": "./coverage/",
    "moduleFileExtensions": [
        "ts",
        "js",
        "yml"
    ],
    "silent": false,
    "testMatch: ["**/test/*.yml", "**/tests/*.yml", "**/*.test.yml", "**/*.spec.yml"],
    "verbose": true
}
```

[Learn what these do here](https://facebook.github.io/jest/docs/en/configuration.html).

An example `bst.json` file:
```
{
    "handler": "src/index.handler",
    "locale": "de-DE",
    "interactionModel": "models/de-DE.json",
    "trace": true,
    "jest": {
        "silent": true
    }
}
```

The handler, interactionModel and trace options are specific to testing.

* handler - The path to the handler (and function name) to run the test
* interactionModel - The path to the interaction model to use for the test
* locale - The locale to be used
* trace - Causes request and response JSON payloads from the skill to be printed to the console

To override [Jest options](https://facebook.github.io/jest/docs/en/configuration.html), just set them under the "jest" key.

## CLI Options
When invoking `bst test`, the name of a specific test to run can be passed, like this:
```
bst test test/MyIntent.test.yml
```

## Test Structure
The test syntax is based on YAML.

When running `bst test`, it automatically searches for files with the following names:

* **/test/\*\*/*.yml
* **/*.test.yml
* **/*.spec.yml

Any tests that match these patterns will be run.
A recommended convention is to sort test files under a test dir.

### Test Suites
Each test file is a test suite. Test suites are made up of one or many tests.

The tests represent discreet conversations with Alexa. Each test can have one or many interactions - here is a simple example:
```
---
configuration:
  locale: en-US
---
- test: "Sequence 01. Test scenario: launch request, no further interaction."
- LaunchRequest: # LaunchRequest is not an utterance but a request type and "reserved" word
  - response.outputSpeech.ssml: "Here's your fact"
  - response.card.type: "Simple"
  - response.card.title: "Space Facts"
  - response.card.content: "/.*/" # Regular expression indicating any text will match

---
- test: "Sequence 02. Test scenario: GetNewFactIntent with different utterances."
- "ask space facts to tell me a space fact":
  - response.outputSpeech.ssml: "/here's your fact.*/i"
  - response.card.type: "Simple"
  - response.card.title: "Space Facts"
  - response.card.content: "/.*/"
- "tell space facts to give me fact":
  - response.outputSpeech.ssml: "/here's your fact.*/i"
  - response.card.type: "Simple"
  - response.card.title: "Space Facts"
  - response.card.content: "/.*/"
```

The test suite above contains two tests. Additionally, at the top it has a configuration element.

The configuraiton provides settings that work across the test - [it is described below](#test-configuration).

The tests represent sequence of conversations with the skill.

They can use specific requests (such as LaunchRequest or SessionEndedRequest), or they can simply be an utterance.

### Test Configuration
The test configuration can override elements set in the global skill testing configuration.

It can also set test-suite specific items such as:

* address: Should be set with address attributes to emulate results from the Address API - [more info here](./use-cases#testing-with-the-address-api).
* applicationId: Sets the applicationId to be used in the generated requests
* deviceId: Sets the deviceId to be used in the generated requests
* dynamo: Should be set to "mock" to use the mock dynamo component - [more info here](./use-cases#testing-with-dynamo).
* userId: Sets the userId to be used in the generated requests

### Test Structure
The start of a test is marked with three dashes on a line - `---`.

It can be followed by an optional test description, which looks like this:
```
- test: "Description of my test"
```

This description, if provided, must be the first line in the test.

The test is then made up of a series of interactions and assertions.

Each interaction is prefixed with a "-" which indicates a YAML colletion.

After each interaction, comes a series of expressions. Typically, these are assertions about the test.
But they can be:

* [Assertions](#assertions): The life-blood of tests - statements about the expected output
* [Request Expressions](#request-expressions): Allow for setting values on the request - helpful for testing more complex cases
* [Intent and Slot Properties](#intent-and-slot-properties): Allow for specifically setting the intents and slots. Bypasses mapping the utterance to the intent and slot.

For each interaction, there can be many assertions and request expressions.
There is not a limit on how much can be tested!

When tests are run, each interaction is processed in order. Within it,
each assertion is in turn evaluated in order when a response is received.

If any assertion fails for a test, the test stops processing, and information about the failed assertion is provided.

### Assertions
An assertion follows one of two simple syntaxes:
[[JSONPath Property]]: [[Expected Value]]
or
[[JSONPath Property]] [[Operator]] [[Expected Value]]

The second syntax provides use more than just equality operators.

The operators are:

* == Partial equals - for example, the expected value "partial sentence" will match "this is a partial sentence"
* =~ Regular expression match
* != Not equal to
* >  Greater than
* >= Greater than or equal
* <  Less than
* <= Less than or equal

Additionally, the `:` operator is the same as == or =~, depending on whether the expected value is a regular expression.

We use JSONPath to get values from the response, such as:
`response.outputSpeech.ssml`

This will return the value: "My SSML Value" from the following JSON response:
```
{
    "response": {
        "outputSpeech": {
            "ssml": "My SSML value"
         }
    }
}
```

The expected value can be:

* A string - quote or unquoted
* A number
* `true` or `false`
* A regular expression - should be denoted with slashes (/this .* that/)
* `undefined` - special value indicating not defined

#### JSONPath Properties
JSONPath is an incredibly expressive way to get values from a JSON object.

You can play around with [how it works here](http://jsonpath.com/).

Besides handling basic properties, it can also navigate arrays and apply conditions.

An array example:
```
{
     "directives": [
      {
        "type": "AudioPlayer.Play",
        "playBehavior": "ENQUEUE",
        "audioItem": {
          "stream": {
            "token": "this-is-the-audio-token",
            "url": "https://my-audio-hosting-site.com/audio/sample-song.mp3",
            "offsetInMilliseconds": 0
          }
        }
      }
    ]
}
```

`directives[0].type == "AudioPlayer.Play"`

#### Shorthand Properties
For certain commonly accessed elements, we offer short-hand properties for referring to them. These are:

* prompt - Grabs either the text or ssml from `response.outputSpeech`, whichever one is set
* reprompt - Grabs either the text or ssml from `response.reprompt.outputSpeech`, which one is set

Example:

```
- test: "My Fact Skill"
- LaunchRequest:
  - prompt: "Here's your fact"
```

The `prompt` property is also used by the Dialog Interface. [More information on that here](./use_cases#testing-with-the-dialog-interface).
#### Regular Expression Values
The expected value can be a regular expression.

If it follows a ":", it must be in the form of /my regular expression/ like this:
```
- response.outputSpeech.ssml: /hello, .*, welcome/i
```

Regular expression flags are also supported with this syntax, such as /case insensitive/i.
They are [described here in more detail](https://javascript.info/regexp-introduction#flags).

#### Collection Values
It is also possible to specify multiple valid values for a property.

That is done with a collection of expected values, such as this:
```
"open howdy"
  - response.outputSpeech.ssml:
    - Hi there
    - Howdy
    - How are you?
```

When a collection is used like this, if any of the values matches, the assertion will be considered a success.

### Intent and Slot properties
Though it is convenient to use the utterance syntax, some times it may not work correctly.

It also is useful to be explicit at times about which intents and slots are desired.

To do that, set a test like so:
```
- "Some utterance"
  - intent: SomeIntent
  - slots:
      SlotA: ValueA
      SlotB: ValueB
```

This interaction will send an IntentRequest with the intent name SomeIntent and slots SlotA and SlotB set to ValueA and ValueB respectively.

Easy, right? The utterance is ignored, but can be useful a form of description.

### Request Expressions
Request expressions allow for setting values explicitly on the request to handler more complex cases.

For example, to set a request attribute explicity in a certain way, just write:
```
- "Some utterance"
  - request.session.attributes.myKey: myValue
```

This will set the value of `myKey` to `myValue`.

The left-hand part of the expression uses JSONPath, same as the assertion.

Note that all request expressions MUST start with request, and when they are setting part of the request element, it will appears redundant:
```
request.request.locale: en-US
```

### Goto And Exit
One advanced feature is support for `goto` and `exit`.

Goto comes at the end of an assertion - if the assertion is true, the test will "jump" to the utterance named.
Unlike regular assertions, ones that end in "goto" will not be deemed a failure if the comparison part of the assertion is not true.

For example:
```
---
- test: "Goes to successfully"
- LaunchRequest:
  - response.outputSpeech.ssml == "Here's your fact:*" goto Get New Fact
  - response.reprompt == undefined
  - response.card.content =~ /.*/
  - exit
- Help:
  - response.outputSpeech.ssml == "Here's your fact:*"
  - response.reprompt == undefined
  - response.card.content =~ /.*/
- Get New Fact:
  - response.outputSpeech.ssml == "ABC"
  - response.reprompt == undefined
  - response.card.content =~ /.*/
```

In this case, if the outputSpeech starts with "Here's your fact",
the test will jump to the last interaction and say "Get New Fact".

If the outputSpeech does not start with "Get New Fact", the other assertions will be evaluated.
The test will end when it reaches the `exit` statement at the end (no further interactions will be processed).

Using `goto` and `exit`, more complex tests can be built.

## Further Reading
Take a look at:
* Our [use cases](use_cases)
* Our [best practices](best_practices)
* Our [getting started guide](get_started)

And don't hesitate to reach out via [Gitter](https://gitter.im/bespoken/bst).
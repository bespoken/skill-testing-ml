# Adding A New Invoker
An invoker allows for:
* Calling skills in different ways (emulators versus simulators, etc.)
* Calling different platforms

To implement an invoker, you must:
* Override the Invoker class
* Override the InvokerResponse class

## Implementing Invoker
The key method is invoke - this takes an interaction object.

The interaction has an utterance property that will be used to call the skill.

If the request payload is available, call `runner.filterRequest` before invoking the skill.

## Implementing InvokerResponse
InvokerResponse specifies a number of methods that should return values.

These represent standardized values to be used across platforms and invocation methods.

Additionally, there is the `supported` method - this takes a field and should return whether is is valid or not.
If it is not valid for the invoker, it should return false.

When false is returned, any assertions related to that field will be skipped.

## To Be Determined
* How to handle case-insensitive fields like transcripts?
* How to handle writing tests that are highly specific per invoker type
* Should we use an event emitter for pre-processing request data
* Come up with better approach for post-processing of errors that are invoker-specific
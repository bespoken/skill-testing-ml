# The Skill Tester

## Install
### Prerequisites
* Node.js >= 8.x.x

### Setup
`npm install skill-testing-ml -g`

## How It Works
Here is a simple example, to test the Get Facts skill:
```
# A simple example of skill test suite
--- # Configuration YAML document
configuration:
  locale: en-US

--- # The --- indicates the start of a new test, which is a self-contained YAML document
- test: "Launches successfully" # Optional info about the test
- LaunchRequest: # LaunchRequest is "reserved" - it is not an utterance but a request type
  - response.outputSpeech.ssml =~ .*Here's your fact:.* # A comment
  - response.reprompt == undefined

---
- test: "Gets a new fact intent"
- "Help":
  - response.outputSpeech.ssml =~ .*You can say.*
- "Get New Facts":
  - response.outputSpeech.ssml == "Here's your fact:"
  - response.card.title  =~   Space Facts # Has extra spaces - need to be handled correctly
  - response.card.content != undefined
```

Output:  
![Skill Testing Output](./docs/SkillTestingOutput.png)

Read the [full specification](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit)

## Current Support
- [X] Multi-turn conversations
- [X] Dialog Interface support
- [X] AudioPlater interface support
- [X] Entity resolution

## Roadmap
- [ ] Explicit SessionEndedRequest
- [ ] Explicit intent and slot setting
- [ ] Support for goto and flow control
- [ ] Wildcard support for non-regex expressions
- [ ] Callbacks for filtering payloads programmatically
- [ ] Virtual device support
- [ ] Support for setting address and permissions
- [ ] Support for testing dynamo

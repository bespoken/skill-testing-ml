[![CircleCI](https://circleci.com/gh/bespoken/skill-testing-ml.svg?style=svg&circle-token=baefda47f4480601f66cc6a579920b2b1bb739e5)](https://circleci.com/gh/bespoken/skill-testing-ml)
[![Build status](https://ci.appveyor.com/api/projects/status/94a7lb3jdioai2jx?svg=true)](https://ci.appveyor.com/project/jkelvie/skill-testing-ml)
[![codecov](https://codecov.io/gh/bespoken/skill-testing-ml/branch/master/graph/badge.svg?token=C2VONoJUN3)](https://codecov.io/gh/bespoken/skill-testing-ml)
# The Skill Tester

## What Is This
A tool for unit-testing Alexa skills.

## How It Works
Write tests in YAML, like this:
```
---
- test: "Sequence 01. Test scenario: launch request, no further interaction."
- LaunchRequest: # LaunchRequest is not an utterance but a request type and "reserved" word
  - response.outputSpeech.ssml: "Here's your fact"
  - response.card.type: "Simple"
  - response.card.title: "Space Facts"
  - response.card.content: "/.*/" # Regular expression indicating any text will match
```

Output:  
<img src="./docs/SkillTestingOutput.png" width="500" alt="Output" />

Read our [getting started guide here](./docs/get_started.md).

For more in-depth info, read the [full specification](https://docs.google.com/document/d/17GOv1yVAKY4vmOd1Vhg_IitpyCMiX-e_b09eufNysYI/edit)

## Current Support
- [X] Multi-turn conversations
- [X] Dialog Interface support
- [X] AudioPlater interface support
- [X] Entity resolution
- [X] Explicit intent and slot setting
- [X] Wildcard support for non-regex expressions
- [X] Support for setting address and permissions
- [X] Explicit SessionEndedRequest
- [X] Support for goto and flow control
- [X] Support for testing dynamo

## Roadmap
- [ ] Much better documentation!
- [ ] Callbacks for filtering payloads programmatically
- [ ] Virtual device support

## Support
[Talk to us on gitter](https://gitter.im/bespoken/bst).

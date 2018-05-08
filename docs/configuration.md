# Configuring
There are a number of options that can be set for skill-testing.

## Configuration
### Example 
```json
{
  "handler": "index.handler",
  "locale": "en-US",
  "jest": {
    "silent": false
  }
}
```

### Skill Testing Configuration
Skill testing parameters:
* handler
* locale

### Jest Configuration
Jest overrides can be set under the jest key.

By default, Jest is configured as follows:
```json
{
    "coverageDirectory": "./coverage/",
    "collectCoverage": true,
    "collectCoverageFrom": [
        "**/*.js",
        "!**/node_modules/**",
        "!**/vendor/**"
    ],
    "moduleFileExtensions": [
        "ts",
        "js",
        "yml"
    ],
    "silent": false,
    "testRegex": "yml",
    "testRunner": "../lib/JestAdapter.js",
    "verbose": true
}
```
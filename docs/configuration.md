# Configuring

## Configuration
### Example 
```json
{
  "jest": {
    "silent": false
  },
  "skillTesting": {
    "handler": "index.handler",
    "jestPath": "../../node_modules/.bin/jest"
  }
}
```

### Skill Testing Configuration
#### 
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
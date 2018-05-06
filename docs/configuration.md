# Configuring

## Jest Configuration
Jest defaults:  
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
    "silent": true,
    "testRegex": "yml",
    "testRunner": JestAdapter.js   "verbose": true
}
```
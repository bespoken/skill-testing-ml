#!/usr/bin/env node

const CLI = require("../lib/runner/CLI");
const debug = require("../lib/util/Debug");
const commandLine = new CLI();

// Print the version when being run standalone
commandLine.printVersion();

commandLine.run(process.argv, { config: "./test/unit/testing.json"}).then(() => {
    debug("SkillTester Completed");
});
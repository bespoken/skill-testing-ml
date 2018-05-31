#!/usr/bin/env node

const CLI = require("../lib/CLI");
const debug = require("../lib/Debug");
const commandLine = new CLI();

commandLine.run(process.argv).then(() => {
    debug("SkillTester Completed");
});
#!/usr/bin/env node

/* eslint-disable no-console */
const CLI = require("../lib/CLI");
const debug = require("../lib/Debug");
const commandLine = new CLI();

commandLine.run().then(() => {
    debug("SkillTester Completed");
});

process.on("unhandledRejection", (e) => {
    console.error(e);
})

process.on("uncaughtException", (e) => {
    console.error(e);
})
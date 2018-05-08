#!/usr/bin/env node
const CLI = require("../lib/CLI");
const commandLine = new CLI();

commandLine.run().then(() => {
    console.log("SkillTester Completed");
});

process.on("unhandledRejection", (e) => {
    console.error(e.message);
})

process.on("uncaughtException", (e) => {
    console.error(e.message);
})
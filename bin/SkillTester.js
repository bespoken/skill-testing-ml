#!/usr/bin/env node
const CLI = require("../lib/CLI");
const commandLine = new CLI();

commandLine.run().then(() => {
    console.log("done");
});

process.on("unhandledRejection", (e) => {
    console.error(e);
})

process.on("uncaughtException", (e) => {
    console.error(e);
})
# Developing on this Project

## Prerequisites
By default, we assume that you are using Node 8.

The project uses that by default, and work can be done without any transpiling with Node 8 installed.

## Babel
Babel is used for distributing the code, so that it works with older node versions.

The "offical" npm tests are run against the babel compiled version of the code, under `dist`.

Additionally, the code under dist is what is distributed on installation.

## Creating Pull Requests
Be sure to run `npm test` before creating PRs.

It will run the tests as well as lint the code. Errors with either will cause the build to fail on Circle CI.
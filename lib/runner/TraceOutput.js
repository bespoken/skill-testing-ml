const fs = require("fs");
const path = require("path");
const Util = require("../util/Util");
const { camelCase, padStart, upperFirst } = require("lodash");

const createDirectoriesForFile = (fileName) => {
    const traceOutputFolder = path.dirname(fileName);
    if (!fs.existsSync(traceOutputFolder)) {
        fs.mkdirSync(traceOutputFolder, { recursive: true });
    }
};

const shortName = longName => longName.split(/[^a-z0-9]/ig)
    .filter(p => p)
    .map(p => p.substring(0, 5))
    .map(p => upperFirst(camelCase(p)))
    .reduce((p, c) => p.length <= 200 ? p.concat(c) : p, "");

const formatTwoDigits = number => padStart(number, 2, "0");

class TraceOutputWriter {
    isEnabled({ traceOutput = false }) {
        return traceOutput;
    }
    writeTraceForProcessResponse({ response = {}, testSuite = {} }) {
        try {
            const { interaction: { utterance: utteranceText, test: { description: testName, interactions: allInteractions } } } = response;
            const { description: testSuiteDescription, runTimestamp: timestamp } = testSuite;
            const utteranceOrder = allInteractions.findIndex(({ utterance }) => utterance === utteranceText);

            const suite = testSuiteDescription || path.parse(testSuite.fileName).name;

            const requestPath = testSuite.resolvePath(
                `./test_output/trace_output/${Util.formatTimeStamp(timestamp)}`
                + `/${shortName(suite)}`
                + `/${shortName(testName)}`
                + `/${formatTwoDigits(utteranceOrder)}-${shortName(utteranceText)}-res.json`
            );

            createDirectoriesForFile(requestPath);

            fs.writeFileSync(requestPath, JSON.stringify(response.json, null, 2) || "");
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("There was an error saving traceOutput file for response", { error });
        }
    }
    writeTraceForRequestPayload({ testSuite = {}, interaction = {}, request = {} }) {
        try {
            const { description: testSuiteDescription, runTimestamp: timestamp } = testSuite;
            const { test: { description: testName } } = interaction;

            const suite = testSuiteDescription || path.parse(testSuite.fileName).name;

            const responsePath = testSuite.resolvePath(
                `./test_output/trace_output/${Util.formatTimeStamp(timestamp)}`
                + `/${shortName(suite)}`
                + `/${shortName(testName)}/req.json`
            );

            createDirectoriesForFile(responsePath);

            fs.writeFileSync(responsePath, JSON.stringify(request, null, 2) || "");
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("There was an error saving traceOutput file for request information", { error });
        }
    }
}

module.exports = {
    traceOutput: new TraceOutputWriter(),
};
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
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
    .reduce((p, c) => p.length <= 20 ? p.concat(c) : p, "");

const createSHA = name => crypto.createHash("shake256", { outputLength: 2 }).update(name).digest("hex").substring(0,4);

const formatTimeStamp = milliseconds => new Date(milliseconds).toISOString().split(/[^0-9]/).filter(f => f).join("");

const formatOrder = number => padStart(number, 2, "0");

class TraceOutputWriter {
    isEnabled({ traceOutput = false }) {
        return traceOutput;
    }
    writeTraceForProcessResponse({ response = {}, testSuite = {} }) {
        try {
            const { interaction: { utterance: utteranceText, test: { description: testName, interactions: allInteractions } } } = response;
            const { description: testSuiteDescription, runTimestamp: timestamp } = testSuite;
            const utteranceOrder = allInteractions.findIndex(({ utterance }) => utterance === utteranceText);
            const randomKey = createSHA(`${testSuiteDescription}${testName}${utteranceText}`);

            const requestPath = testSuite.resolvePath(
                // eslint-disable-next-line 
                `./test_output/trace_output/${shortName(testSuiteDescription)}-${shortName(testName)}-${formatOrder(utteranceOrder)}-${shortName(utteranceText)}-${formatTimeStamp(timestamp)}-${randomKey}-res.json`
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
            const randomKey = createSHA(`${testSuiteDescription}${testName}`);

            const responsePath = testSuite.resolvePath(
                // eslint-disable-next-line 
                `./test_output/trace_output/${shortName(testSuiteDescription)}-${shortName(testName)}-${formatTimeStamp(timestamp)}-${randomKey}-req.json`
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
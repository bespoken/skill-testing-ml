const crypto = require('crypto')
const fs = require('fs')
const { camelCase, upperFirst, padStart } = require('lodash')
const path = require('path')

const mkdirsForFolder = (fileName) => {
    const traceOutputFolder = path.dirname(fileName)
    if (!fs.existsSync(traceOutputFolder)) {
        fs.mkdirSync(traceOutputFolder, { recursive: true })
    }
}

const shortName = (longName) => longName.split(/[^a-z0-9]/ig)
    .filter(p => p)
    .map(p => p.substring(0, 5))
    .map(p => upperFirst(camelCase(p)))
    .reduce((prev, curr) => prev.length <= 20 ? prev.concat(curr) : prev, '')

const createSha = (name) => crypto.createHash('shake256', { outputLength: 2 }).update(name).digest('hex')

const formatTimeStamp = (millis) => new Date(millis).toISOString().split(/[^0-9]/).filter(f => f).join('')

const formatOrder = (number) => padStart(number, 2, '0')

class TraceOutputWriter {
    isEnabled({ traceOutput = false }) {
        return traceOutput
    }
    writeTraceForProcessResponse({ response = {}, testSuite = {}, context = {} }) {
        try {
            const { interaction: { utterance: utteranceText, test: { description: testName, interactions: allInteractions } } } = response
            const { description: testSuiteDescription, runTimestamp: timestamp } = testSuite
            const utteranceOrder = allInteractions.findIndex(({ utterance }) => utterance === utteranceText)
            const shaRandom = createSha(`${testSuiteDescription}${testName}${utteranceText}`)

            const requestPath = testSuite.resolvePath(`./test_output/trace_output/${shortName(testSuiteDescription)}-${shortName(testName)}-${formatOrder(utteranceOrder)}-${shortName(utteranceText)}-${formatTimeStamp(timestamp)}-${shaRandom}-res.json`)
            mkdirsForFolder(requestPath)
            fs.writeFileSync(requestPath, JSON.stringify(response.json, null, 2) || '')
        } catch (error) {
            console.warn(`There was an error saving traceOutput file for response`, { error })
        }
    }
    writeTraceForRequestPayload({ testSuite = {}, interaction = {}, request = {} }) {
        try {
            const { description: testSuiteDescription, runTimestamp: timestamp } = testSuite
            const { test: { description: testName } } = interaction
            const shaRandom = createSha(`${testSuiteDescription}${testName}`)

            const responsePath = testSuite.resolvePath(`./test_output/trace_output/${shortName(testSuiteDescription)}-${shortName(testName)}-${formatTimeStamp(timestamp)}-${shaRandom}-req.json`)
            mkdirsForFolder(responsePath)
            fs.writeFileSync(responsePath, JSON.stringify(request, null, 2) || '')
        } catch (error) {
            console.warn(`There was an error saving traceOutput file for request information`, { error })
        }
    }
}


module.exports = {
    traceOutput: new TraceOutputWriter()
}
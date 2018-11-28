require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const SMAPI = require("../lib/util/SMAPI");

// We only run tests if the SMAPI variable is set
const describeIf = process.env.SMAPI ? describe : describe.skip;

// These tests are configured to be run separately from other tests. This is because:
//  1) They are complex to setup, with a dependency on a particular skill
//  2) The simulate API cannot be called concurrently, which interferes with the parallel Jest behavior
//  3) When running on CI, we encounter an issue where the Virtual Alexa nock mocks do not appear to be cleaned up correctly
describeIf("test suite", () => {
    jest.setTimeout(30000);
    beforeAll(() => {
        // Create an ask config if it does not exist
        const askConfigPath = path.join(os.homedir(), ".ask/cli_config");
        if (fs.existsSync(askConfigPath)) {
            return;
        }
        
        // We get the key values for creating the ASK config from environment variables
        if (!process.env.ASK_ACCESS_TOKEN ||
            !process.env.ASK_REFRESH_TOKEN ||
            !process.env.ASK_VENDOR_ID) {
            throw new Error("Environment variables ASK_ACCESS_TOKEN, ASK_REFRESH_TOKEN and ASK_VENDOR_ID must all be set");
        }

        // Create the JSON, substituting environment variables for secret values
        const askConfigJSON = {
            profiles: {
                default: {
                    aws_profile: "__AWS_CREDENTIALS_IN_ENVIRONMENT_VARIABLE__",
                    token: {
                        access_token: process.env.ASK_ACCESS_TOKEN,
                        expires_at: "2018-11-23T23:52:46.552Z",
                        expires_in: 3600,
                        refresh_token: process.env.ASK_REFRESH_TOKEN,
                        token_type: "bearer"
                    },
                    vendor_id: process.env.ASK_VENDOR_ID,
                }
            }
        }

        // Write the config to disk
        const askDir = path.join(os.homedir(), ".ask");
        if (!fs.existsSync(askDir)) {
            fs.mkdirSync(askDir);
        }
        fs.writeFileSync(askConfigPath, JSON.stringify(askConfigJSON));
    });

    test("simulate", async () => {
        // eslint-disable-next-line
        const token = SMAPI.fetchAccessTokenFromConfig();
        // eslint-disable-next-line
        const skillID = "amzn1.ask.skill.2d19cb76-c064-4cf3-8eed-bad3bc9444e5"
        const smapi = new SMAPI(token, skillID, "en-US", true);
        let result = await smapi.simulate("launch guess the gif", true);
        expect(result.status).toBe("SUCCESSFUL");
        let skillResponse = result.result.skillExecutionInfo.invocationResponse.body;
        expect(skillResponse.response.outputSpeech.type).toBe("SSML");
        if (skillResponse.response.outputSpeech.ssml.includes("Please say yes or no")) {
            result = await smapi.simulate("yes");
            skillResponse = result.result.skillExecutionInfo.invocationResponse.body;
            expect(skillResponse.response.outputSpeech.ssml).toBe("Guess");
        }
        //result = await smapi.simulate("rabbit");
    });
});
require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const SMAPI = require("../lib/util/SMAPI");

// We only run tests if the ASK_ACCESS_TOKEN variable is set
const describeIf = process.env.ASK_ACCESS_TOKEN ? describe : describe.skip;

// These tests are configured to only be run for one job on Circle CI
// If we run them on concurrent jobs, on Circle or AppVeyor, we are liable to get errors
// This is because the Simulation API does not allow for concurrent calls
describeIf("test suite", () => {
    jest.setTimeout(30000);
    beforeAll(() => {
        delete require.cache[require.resolve("https")];
        
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
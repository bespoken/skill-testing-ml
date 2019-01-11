require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const SMAPI = require("../lib/util/SMAPI");

const describeIf = process.env.SMAPI ? describe : describe.skip;

// These tests are configured to be run separately from other tests. This is because:
//  1) They are complex to setup, with a dependency on a particular skill
//  2) The simulate API cannot be called concurrently, which interferes with the parallel Jest behavior
//  3) When running on CI, we encounter an issue where the Virtual Alexa nock mocks do not appear to be cleaned up correctly
describeIf("SMAPI tests", () => {
    jest.setTimeout(30000);
    beforeAll(() => {
        // Create an ask config if it does not exist
        const askConfigPath = path.join(os.homedir(), ".ask/cli_config");
        if (fs.existsSync(askConfigPath)) {
            return;
        }

        // We get the key values for creating the ASK config from environment variables
        if (
            !process.env.ASK_ACCESS_TOKEN ||
			!process.env.ASK_REFRESH_TOKEN ||
			!process.env.ASK_VENDOR_ID ||
			!process.env.ASK_SKILL_ID ||
			!process.env.VIRTUAL_DEVICE_TOKEN
        ) {
            throw new Error(
                "Environment variables ASK_ACCESS_TOKEN, ASK_REFRESH_TOKEN, ASK_VENDOR_ID, ASK_SKILL_ID and VIRTUAL_DEVICE_TOKEN must all be set"
            );
        }

        // Create the JSON, substituting environment variables for secret values
        const askConfigJSON = {
            profiles: {
                default: {
                    aws_profile: "__AWS_CREDENTIALS_IN_ENVIRONMENT_VARIABLE__",
                    token: {
                        access_token: process.env.ASK_ACCESS_TOKEN,
                        expires_at: "2019-01-11T11:05:35.726Z",
                        expires_in: 3600,
                        refresh_token: process.env.ASK_REFRESH_TOKEN,
                        token_type: "bearer",
                    },
                    vendor_id: process.env.ASK_VENDOR_ID,
                },
                nonDefault: {
                    token: {
                        access_token: "TEST",
                    },
                },
            },
        };

        // Write the config to disk
        const askDir = path.join(os.homedir(), ".ask");
        if (!fs.existsSync(askDir)) {
            fs.mkdirSync(askDir);
        }
        fs.writeFileSync(askConfigPath, JSON.stringify(askConfigJSON));
    });

    test("simulate with ASK CLI", async () => {
        const token = SMAPI.fetchAccessTokenFromConfig();
        const skillID = process.env.ASK_SKILL_ID;
        const smapi = new SMAPI(token, skillID, "live", "en-US", true);
        let result = await smapi.simulate("launch guess the gif", true);
        expect(result.status).toBe("SUCCESSFUL");
        let skillResponse =
            result.result.skillExecutionInfo.invocations[0].invocationResponse.body;
        expect(skillResponse.response.outputSpeech.type).toBe("SSML");
        if (
            skillResponse.response.outputSpeech.ssml.includes(
                "Please say yes or no"
            )
        ) {
            result = await smapi.simulate("yes");
            skillResponse =
                 result.result.skillExecutionInfo.invocations[0].invocationResponse.body;
            expect(skillResponse.response.outputSpeech.ssml).toBe("Guess");
        }
    });

    test("Gets a non-default token when environment variable is set", () => {
        // In order to run this test locally, need to create a "nonDefault" profile in .ask/cli_config
        // See the JSON above for what that should look like
        process.env.ASK_DEFAULT_PROFILE = "nonDefault";
        const token = SMAPI.fetchAccessTokenFromConfig();
        expect(token).toBe("TEST");
        delete process.env.ASK_DEFAULT_PROFILE;
    });

    test.skip("simulate with access token", async () => {
        const token = await SMAPI.fetchAccessTokenFromServer(
            process.env.VIRTUAL_DEVICE_TOKEN
        );
        const skillID = process.env.ASK_SKILL_ID;
        const smapi = new SMAPI(token, skillID, "live", "en-US", false);
        let result = await smapi.simulate("launch guess the gif", true);
        expect(result.status).toBe("SUCCESSFUL");
        let skillResponse =
            result.result.skillExecutionInfo.invocations[0].invocationResponse.body;
        expect(skillResponse.response.outputSpeech.type).toBe("SSML");
    });
});

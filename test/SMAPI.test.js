const SMAPI = require("../lib/util/SMAPI");

describe("test suite", () => {
    jest.setTimeout(30000);
    beforeEach(() => {
        
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
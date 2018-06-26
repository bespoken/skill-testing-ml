const Configuration = require("../lib/runner/Configuration");
const TestRunner = require("../lib/runner/TestRunner");

describe("test runner", () => {
    beforeEach(() => {
        return Configuration.configure({
            handler: "test/FactSkill/index.handler",
            interactionModel: "test/FactSkill/models/en-US.json",
            locale: "en-US"
        });
    });

    afterEach(() => {
        Configuration.singleton = undefined;
    });

    test("subscribe()", async () => {
        const runner = new TestRunner();
        const messageCallback = (error, test) => {
            expect(test.description).toBeDefined();
        };
        const resultCallback = (error, test) => {
            expect(test.interactionResults).toBeDefined();
        };
        const messageCallbackMock = jest.fn(messageCallback);
        const resultCallbackMock = jest.fn(resultCallback);
        runner.subscribe("message", messageCallbackMock);
        runner.subscribe("result", resultCallbackMock);
  
        await runner.run("test/FactSkill/fact-skill-tests.common.yml");
        
        expect(messageCallbackMock).toHaveBeenCalledTimes(3);
        expect(resultCallbackMock).toHaveBeenCalledTimes(3);
    });
});

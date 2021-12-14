const StopWatch = require("../lib/util/StopWatch");

describe("StopWatch", () => {
    test("get elapsed time", async () => {
        const stopWatch = new StopWatch();
        stopWatch.resetAndStart();

        await new Promise(resolve => setTimeout(resolve, 1000)).then(() => stopWatch.stop());

        expect(stopWatch.toDto()).toHaveProperty("elapsedTime");
        expect(stopWatch.toDto().elapsedTime).toBeGreaterThanOrEqual(1000);
        expect(stopWatch.toDto()).toHaveProperty("start");
        expect(stopWatch.toDto()).toHaveProperty("end");
    });
});
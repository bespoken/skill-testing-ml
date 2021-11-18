const StopWatch = require("../lib/util/StopWatch");

describe("StopWatch", () => {
    test("get elapsed time", async () => {
        const stopWatch = new StopWatch();
        stopWatch.resetAndStart();

        await new Promise(resolve => setTimeout(resolve, 5000)).then(() => stopWatch.stop());

        expect(stopWatch.toDto()).toHaveProperty("elapsedTime", 5000);
        expect(stopWatch.toDto()).toHaveProperty("start");
        expect(stopWatch.toDto()).toHaveProperty("end");
    });
});
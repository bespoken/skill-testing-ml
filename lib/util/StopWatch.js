/**
 * Class to store and calculate elapsed time between two execution.
 */
module.exports = class StopWatch {

    constructor() {
        this._end = null;
        this._start = null;
    }
    /**
     * Reset the start timestamp to now.
     */
    resetAndStart() {
        this._start = new Date();
        this._end = null;
    }

    /**
     * Update the value of end timestamp
     */
    stop() {
        this._end = new Date();
    }

    get elapsedTime() {
        try {
            return this._end.getTime() - this._start.getTime();
        } catch (ex) {
            return -1;
        }
    }

    /**
     * Converts information into a Dto  
     * @returns object with the information of the start timestamp, end timestamp and elapsed time in milliseconds
     */
    toDto() {
        const start = new Date(this._start);
        const end = new Date(this._end);
        const elapsedTime = this.elapsedTime;

        return { elapsedTime, end, start };
    }

};

module.exports = {
    onRequest: function (test, request) {
        this.callbackStart(test, request);
    },
    onResponse: function (test, response) {
        this.callbackEnd(test, response);
    },
    onTestEnd: function (test, testResult) {
        this.callbackEnd(test, testResult);
    },
    onTestStart: function (test) {
        this.callbackStart(test);
    },
    onTestSuiteEnd: function (testResult) {
        this.callbackEnd(testResult);
    },
    onTestSuiteStart: function (testSuite) {
        this.callbackStart(testSuite);
    },
    setCallbackEnd: function(callback) {
        this.callbackEnd = callback;
    },
    setCallbackStart: function(callback) {
        this.callbackStart = callback;
    },
};
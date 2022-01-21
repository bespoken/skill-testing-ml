const HTTP = require("../util/HTTP");
const url = require("url");
const { cloneDeep } = require("lodash");


const postDataIntoEndpoint = async (payload) => {
    const baseUrl = process.env.BESPOKEN_API_BASE_URL || "https://bespoken-api.bespoken.tools";
    const method = "POST";
    const headers = { "Content-Type": "application/json" };

    const endpoint = url.parse(baseUrl)
        .resolveObject("/reporting/testResults");

    const {
        hostname: host,
        port,
        protocol,
        path,
    } = endpoint;
    return HTTP.post({ headers, host, method, path, port, protocol }, payload);
};

class ResultsPublisher {
    async publishResults(data) {
        const payload = JSON.parse(JSON.stringify(cloneDeep(data), function (key, value) {
            if (key === "_testSuite") {
                value._tests = undefined;
                return value;
            }
            if (key === "_interactions" && Array.isArray(value)) {
                return value.map((e) => { delete e._test; return e; });
            }
            if (key === "_interaction" && Array.isArray(value)) {
                return value.map((e) => { delete e._test; return e; });
            }
            if (key === "_assertions" && Array.isArray(value)) {
                return value.map((e) => { delete e._interaction; return e; });
            }
            return value;
        }));
        return postDataIntoEndpoint(payload);
    }
}

module.exports = {
    ResultsPublisher,
};

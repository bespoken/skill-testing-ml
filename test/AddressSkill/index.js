const https = require("https");

exports.handler = function(event, context) {
    callAddressAPI(event.context.System.apiAccessToken, event.context.System.device.deviceId).then((response) => {
        context.done(null, response);
    });
};

function callAddressAPI(apiAccessToken, deviceID) {
    const authorization = "Bearer " + apiAccessToken;
    let payload;
    return new Promise((resolve) => {
        const request = https.request({
            headers: {
                authorization,
            },
            host: "api.amazonalexa.com",
            method: "GET",
            path: "/v1/devices/" + deviceID + "/settings/address",
        }, (response) => {
            const statusCode = response.statusCode;
            response.setEncoding("utf8");

            response.on("data", (chunk) => {
                if (!payload) {
                    payload = "";
                }
                payload += chunk;
            });

            response.on("end", () => {
                if (payload) {
                    payload = JSON.parse(payload);
                }
                resolve({
                    payload,
                    statusCode,
                });
            });

        });
        request.end();
    });
}

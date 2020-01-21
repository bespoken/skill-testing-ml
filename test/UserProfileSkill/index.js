const https = require("https");

exports.handler = async function(event, context) {
    const responseName = await callAddressAPI(event.context.System.apiAccessToken, "name");
    const responseGivenName = await callAddressAPI(event.context.System.apiAccessToken, "givenName");
    const responsePhoneNumber = await callAddressAPI(event.context.System.apiAccessToken, "mobileNumber");

    context.done(null, { payload: {
        givenName: responseGivenName.payload,
        mobileNumber: responsePhoneNumber.payload,
        name: responseName.payload,
    }});
};

function callAddressAPI(apiAccessToken, key) {
    const authorization = "Bearer " + apiAccessToken;
    let payload;
    return new Promise((resolve) => {
        const request = https.request({
            headers: {
                authorization,
            },
            host: "api.amazonalexa.com",
            method: "GET",
            path: "/v2/accounts/~current/settings/Profile." + key,
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

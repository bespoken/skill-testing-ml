exports.handler = function(event, context) {
    const response = {};
    if (event.session.user.accessToken) {
        response.accessToken = event.session.user.accessToken;
    }

    if (event.requestFiltered) {
        response.requestFiltered = true;
    }

    if (event.test.numberValue !== 1) {
        throw new Error("Number value not set correctly");
    }

    if (event.test.stringValue !== "hi") {
        throw new Error("String value not set correctly");
    }

    if (event.test.booleanValue !== true) {
        throw new Error("Boolean value not set correctly");
    }

    if (event.test.booleanValueFalse !== false) {
        throw new Error("Boolean value not set correctly");
    }

    if (event.test.stringValueTrue !== true) {
        throw new Error("String true value not set correctly");
    }

    context.done(null, response);
};
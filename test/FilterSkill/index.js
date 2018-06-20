exports.handler = function(event, context) {
    const response = {};
    if (event.session.user.accessToken) {
        response.accessToken = event.session.user.accessToken;
    }

    if (event.requestFiltered) {
        response.requestFiltered = true;
    }

    context.done(null, response);
}
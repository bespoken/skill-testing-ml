exports.handler = function(event, context) {
    const response = {};
    if (event.session.user.accessToken) {
        response.accessToken = event.session.user.accessToken;
    }

    if (event.requestFiltered) {
        response.requestFiltered = true;
    }

    response.audioPlayerSupported = event.audioPlayerSupported;
    response.displaySupported = event.displaySupported;
    response.videoAppSupported = event.videoAppSupported;
    response.userId = event.session.user.userId;
    response.deviceId = event.context.System.device.deviceId;
    context.done(null, response);
}
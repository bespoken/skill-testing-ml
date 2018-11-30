module.exports = {
    onRequest: (test, request) => {
        request.requestFiltered = true;
        request.audioPlayerSupported = !!request.context.System.device.supportedInterfaces.AudioPlayer;
        request.displaySupported = !!request.context.System.device.supportedInterfaces.Display;
        request.videoAppSupported = !!request.context.System.device.supportedInterfaces.VideoApp;
    },

    onResponse: (test, response) => {
        response.responseFiltered = true;
    },
};
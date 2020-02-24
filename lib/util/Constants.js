const CONSTANTS = {
    INVOKER: {
        SMAPIInvoker: "SMAPIInvoker",
        virtualAlexaInvoker: "VirtualAlexaInvoker",
        virtualDeviceInvoker: "VirtualDeviceInvoker",
        virtualGoogleAssistantInvoker: "VirtualGoogleAssistantInvoker",
    },
    PLATFORM: {
        alexa: "alexa",
        google: "google",
    },
    RETRY_NUMBER_DEFAULT_VALUE: 2,
    RETRY_NUMBER_MAX_VALUE: 5,
    TYPE: {
        e2e: "e2e",
        simulation: "simulation",
        unit: "unit",
    },
};

module.exports = CONSTANTS;

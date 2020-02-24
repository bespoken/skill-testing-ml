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
    TYPE: {
        e2e: "e2e",
        simulation: "simulation",
        unit: "unit",
    },
    RETRY_NUMBER_DEFAULT_VALUE: 2,
    RETRY_NUMBER_MAX_VALUE: 5,
};

module.exports = CONSTANTS;

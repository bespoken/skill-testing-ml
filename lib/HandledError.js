module.exports = class HandledError {
    static CODE_YAML_SYNTAX() {
        return "YAML Syntax";
    }

    static error(code, message, testDescription, interaction) {
        // TODO - this should be handled inside the parseInteraction
        message = code + " Error: " + message;
        if (testDescription) {
            message += "\nTest: " + testDescription;
        }
        if (interaction) {
            message += "\nInteraction: " + interaction.utterance;
        }

        const error = new Error(message);
        error.name = code;
        error.handled = true;
        return error;
    }
}
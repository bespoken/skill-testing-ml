module.exports = class ParserError {
    static error(message, line, test, interaction) {
        const error = new Error(message);
        error.name = "YAML Syntax Error";
        error.line = line;
        error.test = test;
        error.interaction = interaction;
        error.handled = true;
        error.toString = () => {
            message = "YAML Error: " + message;
            if (line) {
                message += "\nLine: " + line;
            }

            if (test) {
                message += "\nTest: " + test.description;
            }


            if (interaction) {
                message += "\nInteraction: " + interaction.utterance;
            }
        };
        return error;
    }
}
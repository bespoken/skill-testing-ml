module.exports = class ParserError {
    static error(message, line, interaction) {
        const error = new Error(message);
        error.name = "YAML Syntax Error";
        error.line = line;
        error.test = interaction ? interaction.test : undefined;
        error.interaction = interaction;
        error.handled = true;

        if (error.line && error.test) {
            error.message += "\nat " + error.test.testSuite.fileName + ":" + (line + 1) + ":0";
        }
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
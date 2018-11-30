const Util = require("../util/Util");

module.exports = class ParserError {
    static interactionError(interaction, message, line) {
        let file = interaction.test.testSuite.fileName;
        const error = ParserError.error(file, message, line);

        error.test = interaction ? interaction.test : undefined;
        error.interaction = interaction;
        return error;
    }

    static globalError(file, message, line) {
        return ParserError.error(file, message, line);
    }

    static error(file, message, line) {
        const errorType = "Test Syntax Error";
        let fullMessage = errorType + ":\n\t";
        fullMessage += message;
        fullMessage = Util.errorMessageWithLine(fullMessage, file, line);

        const error = new Error(fullMessage);
        error.name = errorType;
        error.handled = true;
        error.line = line;
        return error;
    }
};
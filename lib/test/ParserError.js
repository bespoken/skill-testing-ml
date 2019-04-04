const Util = require("../util/Util");

/**
 * Represents a error while parsing an interaction
 */
class ParserError {
    /**
     *
     * @param {TestInteraction} interaction - the interaction that generated the error
     * @param {string} message - the error message that we will show
     * @param {number} line - which line have the error
     * @return {ParserError}
     */
    static interactionError(interaction, message, line) {
        let file = interaction.test.testSuite.fileName;
        const error = ParserError.error(file, message, line);

        error.test = interaction ? interaction.test : undefined;
        error.interaction = interaction;
        return error;
    }

    /**
     * Creates a new Error object
     * @param {string} file - the file where the error has occurred
     * @param {string} message - Error message for the user
     * @param {number} line - in which line the error has occurred
     * @return {Error}
     */
    static globalError(file, message, line) {
        return ParserError.error(file, message, line);
    }

    /**
     * Creates a new Error object
     * @param {string} file - the file where the error has occurred
     * @param {string} message - Error message for the user
     * @param {number} line - in which line the error has occurred
     * @return {Error}
     */
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
}

module.exports = ParserError;
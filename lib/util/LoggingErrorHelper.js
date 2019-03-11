const winston = require("winston");
const { combine, printf, timestamp } = winston.format;

class LoggingErrorHelper {
    static error (logger, message) {
        LoggingErrorHelper.log("error", logger, message);
    }

    static initialize (file) {
        const logFile = file || "bst-debug.log";
        const format = printf(({ level, message, timestamp }) => {
            return `${timestamp} ${level}: ${message}`;
        });

        winston.clear();
        LoggingErrorHelper.logger = winston.createLogger({
            format:  combine(
                timestamp(),
                format
            ),
            level: "error",
            transports: [
                new (winston.transports.File)({
                    filename: logFile,
                    level: "error",
                }),
            ],
        });
    }

    static log (level, logger, message) {
        if (!LoggingErrorHelper.logger) {
            LoggingErrorHelper.initialize();
        }
        // right pad and then truncate the logger name leaving a tab
        const loggerString = logger + "              ".substr(0, 10);
        LoggingErrorHelper.logger.log(level, loggerString + "  " + message);
    }
}

module.exports = LoggingErrorHelper;
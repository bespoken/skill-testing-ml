module.exports = class HandledError {
    static CODE_YAML_SYNTAX() {
        return "YAML Syntax";
    }

    static error(code, message) {
        const error = new Error(message);
        error.name = code;
        return error;
    }
}
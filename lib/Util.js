const _ = require("lodash");

module.exports = class Util {
    static cleanString(s) {
        if (!Util.isString(s)) {
            return s;
        }

        if (s.valueOf() === "undefined") {
            return undefined;
        }

        if (s.startsWith("\"")
            && s.endsWith("\"")) {
            s = s.substr(1, s.length-2).toString();
        }
        return s.toString();
    }

    static isString(s) {
        return (s && (typeof s === "string" || s instanceof String));
    }

    static isNumber(s) {
        return (s && (typeof s === "number" || s instanceof Number));
    }

    static isObject(o) {
        return (_.isObject(o) && !Util.isString(o) && !Util.isNumber());
    }

    static isValueType(s) {
        return Util.isString(s) || Util.isNumber(s);
    }

    static extractLine(s) {
        return s._yaml ? s._yaml.line : undefined;
    }
}
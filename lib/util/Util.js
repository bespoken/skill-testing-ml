const _ = require("lodash");

module.exports = class Util {
    static cleanString(s) {
        if (!Util.isString(s)) {
            return s;
        }

        if (s.valueOf() === "undefined") {
            return undefined;
        } else if (s.valueOf() === "null") {
            return null;
        }

        if (s.startsWith("\"")
            && s.endsWith("\"")) {
            s = s.substr(1, s.length-2).toString();
        }
        return s.toString();
    }

    static cleanObject(o) {
        if (_.isObject(o) && o._yaml) {
            delete o._yaml;
        }

        for (const key of Object.keys(o)) {
            o[key] = Util.cleanValue(o[key]);
        }
        return o;
    }

    static cleanValue(value) {
        if (Util.isString(value)) {
            return Util.cleanString(value);
        } else if (Util.isNumber(value)) {
            return value.valueOf();
        } else if (Util.isObject(value)) {
            return this.cleanObject(value);
        } else if (Array.isArray(value)) {
            const stringArray = [];
            for (const v of value) {
                stringArray.push(Util.cleanString(v));
            }
            return stringArray;
        }

        return value;
    }

    static errorMessageWithLine(message, file, line) {
        if (line && file) {
            message += "\nat " + file + ":" + line + ":0";
        }
        return message;
    }

    static isString(s) {
        return (s && (typeof s === "string" || s instanceof String));
    }

    static isNumber(s) {
        return (s && (typeof s === "number" || s instanceof Number));
    }

    static isObject(o) {
        return (_.isObject(o) && !Array.isArray(o) && !Util.isString(o) && !Util.isNumber());
    }

    static isValueType(s) {
        return Util.isString(s) || Util.isNumber(s);
    }

    static extractLine(s) {
        return s && s._yaml ? (s._yaml.line + 1) : undefined;
    }
}
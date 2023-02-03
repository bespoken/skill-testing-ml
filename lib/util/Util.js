const _ = require("lodash");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { padStart } = require("lodash");

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
            s = s.substr(1, s.length - 2).toString();
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
            // Boolean values come in from YAML parsing as strings, so we do special handling for them
            if (Util.isBoolean(value)) {
                return value.toString() === "true";
            } else {
                return Util.cleanString(value);
            }
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

    static isBoolean(s) {
        return (s && (s.toString() === "true" || s.toString() === "false"));
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

    static async sleep(time) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    }

    static padZero(original, characters) {
        const sliceValue = -1 * (characters ? characters : 2);
        return ("0" + original).slice(sliceValue);

    }

    static returnIntentObjectFromUtteranceIfValid(utterance) {
        const notEmpty = value => value && value.trim() !== "";
        const toSlot = (accumulator, item) => {
            const [key, val] = item.split("=");
            accumulator[key] = val.replace(/"/g, "");
            return accumulator;
        };
        const intentRegex = /([\w|.|-]*)((?: \w*=(?:"(?:[^"])*"|(?:[^ ])*))*)/;
        const match = intentRegex.exec(utterance);
        if (match && match[0] === utterance) {
            const intent = { name: match[1] };
            if (match[2]) {
                const slots = match[2].split(/(\w*=(?:"(?:[^"])*"|(?:[^ ])*))/g);
                intent.slots = slots.filter(notEmpty).reduce(toSlot, {});
            }
            return intent;
        }
        return undefined;
    }

    static formatDate(date) {
        return date.getFullYear() + "-" + Util.padZero(date.getMonth() + 1) + "-" + Util.padZero(date.getDate()) + "T" +
            Util.padZero(date.getHours()) + ":" + Util.padZero(date.getMinutes()) + ":" +
            Util.padZero(date.getSeconds()) + "." + Util.padZero(date.getMilliseconds(), 3);
    }

    static async readFiles(dirname) {
        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(dirname)) {
                    resolve([]);
                }
                const files = fs.readdirSync(dirname);
                const promises = files.map((filename) => {
                    return new Promise((resolveF, rejectF) => {
                        fs.readFile(dirname + filename, "utf8", (error, content) => {
                            if (error) {
                                rejectF(error);
                            }
                            resolveF({
                                content,
                                filename,
                            });
                        });
                    });
                });
                return resolve(Promise.all(promises));
            } catch (error) {
                reject(error);
            }
        });
    }

    static createAskCliConfig() {
        // Create an ask config if it does not exist
        const askConfigPath = path.join(os.homedir(), ".ask", "cli_config");
        if (fs.existsSync(askConfigPath)) {
            return;
        }

        // We get the key values for creating the ASK config from environment variables
        if (
            !process.env.ASK_ACCESS_TOKEN ||
            !process.env.ASK_REFRESH_TOKEN ||
            !process.env.ASK_VENDOR_ID ||
            !process.env.ASK_SKILL_ID ||
            !process.env.VIRTUAL_DEVICE_TOKEN
        ) {
            throw new Error(
                "Environment variables ASK_ACCESS_TOKEN, ASK_REFRESH_TOKEN, ASK_VENDOR_ID, ASK_SKILL_ID and VIRTUAL_DEVICE_TOKEN must all be set"
            );
        }

        // Create the JSON, substituting environment variables for secret values
        const askConfigJSON = {
            profiles: {
                default: {
                    aws_profile: "__AWS_CREDENTIALS_IN_ENVIRONMENT_VARIABLE__",
                    token: {
                        access_token: process.env.ASK_ACCESS_TOKEN,
                        expires_at: "2019-01-11T11:05:35.726Z",
                        expires_in: 3600,
                        refresh_token: process.env.ASK_REFRESH_TOKEN,
                        token_type: "bearer",
                    },
                    vendor_id: process.env.ASK_VENDOR_ID,
                },
                nonDefault: {
                    token: {
                        access_token: "TEST",
                    },
                },
            },
        };

        // Write the config to disk
        const askDir = path.join(os.homedir(), ".ask");
        if (!fs.existsSync(askDir)) {
            fs.mkdirSync(askDir);
        }
        fs.writeFileSync(askConfigPath, JSON.stringify(askConfigJSON));
    }

    static isErrorObject(e) {
        return e && e.stack && e.message && typeof e.stack === "string"
            && typeof e.message === "string";
    }

    static filterExist(filters, filterName) {
        if (filters && filters.length) {
            for (let index = 0; index < filters.length; index++) {
                const filter = filters[index];
                if (filter && filter[filterName]) {
                    return true;
                }
            }
        }
        return false;
    }

    static async executeFilter(filters, filterName, ...args) {
        let result;
        if (filters && filters.length) {
            for (let index = 0; index < filters.length; index++) {
                const filter = filters[index];
                if (filter && filter[filterName]) {
                    const filterResult = await filter[filterName](...args);
                    if (!result && typeof filterResult !== "undefined") {
                        result = filterResult;
                    }
                }
            }
        }
        return result;
    }

    static executeFilterSync(filters, filterName, ...args) {
        let result;
        if (filters && filters.length) {
            for (let index = 0; index < filters.length; index++) {
                const filter = filters[index];
                if (filter && filter[filterName]) {
                    const filterResult = filter[filterName](...args);
                    if (!result && typeof filterResult !== "undefined") {
                        result = filterResult;
                    }
                }
            }
        }

        return result;
    }

    static formatTimeStamp(milliseconds) {
        const formatTwoDigits = number => padStart(number, 2, "0");

        const timestamp = new Date(milliseconds);
        const date = `${timestamp.getFullYear()}${formatTwoDigits(timestamp.getMonth() + 1)}${formatTwoDigits(timestamp.getDate())}`;
        const time = `${formatTwoDigits(timestamp.getHours())}${formatTwoDigits(timestamp.getMinutes())}${formatTwoDigits(timestamp.getSeconds())}`;
    
        return `${date}_${time}`;
    }
};
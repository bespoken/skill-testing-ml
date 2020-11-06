const _ = require("lodash");
const Util = require("../util/Util");

/**
 * Represents request expressions used to modify the request before doing the test
 */
class Expression {
    /**
     *
     * @param {object} element - one of the elements generated during the yaml parsing
     * @return {boolean}
     */
    static isExpression(element) {
        const keys = Object.keys(element);
        return (keys.length > 0 &&
            (keys[0].startsWith("request") || keys[0].startsWith("set "))
        );
    }

    /**
     *
     * @param {object} element - one of the elements generated during the yaml parsing
     */
    constructor(element) {
        this._path = Object.keys(element)[0];
        this._value = element[this._path];
    }

    /**
     * the path of the request property we want to modify
     * @return {string}
     */
    get path() {
        return this._path;
    }

    /**
     * the value we want to set in the request property path
     * @return {string}
     */
    get value() {
        return Util.cleanValue(this._value);
    }

    /**
     * Replace the property indicated by the expression path with the value indicated
     * @param {object} json - request that we are going to modify
     */
    apply(json) {
        // Chop off the mandatory request at the front
        const paths = this.path.split(".").slice(1);
        const path = paths.join(".");
        if (path) {
            _.set(json, path, this.value);
        }
    }

    /**
     * Returns the interaction part of a yaml object
     * {input: string, expect: object[]}
     * @return {object}
    */
    toYamlObject() {
        return {
            path: this.path,
            value: this.value,
        };
    }
}

module.exports = Expression;
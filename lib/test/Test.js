const ParserError = require("./ParserError");
const Util = require("../util/Util");

/**
 * Represent a single test
 */
class Test {
    /**
     *
     * @param {TestSuite} suite - The test suite that contains this test.
     * @param {string | object} metadata - Metadata includes the description as a string or an object including the
     * description property.
     * @param {array} interactions - The interactions that form this test
     */
    constructor(suite, metadata, interactions) {
        this._testSuite = suite;
        this._description = undefined;
        if (metadata) {
            if (Util.isString(metadata)) {
                this._description = metadata;
            } else {
                this._metadata = metadata;
                this._description = metadata.description;
            }
        }
        this._interactions = interactions;
        this._skip = false;
        this._only = false;
        this._index = 0;
        this._tags = [];
    }

    /**
     * Get the Test's description.
     * @return {string} The test description.
     */
    get description() {
        return this._description;
    }

    /**
     * Set the Test's description.
     * @param {string} value - test description
     */
    set description(value) {
        this._description = value;
    }

    /**
     * Get the Test's index.
     * @return {number} The test index.
     */
    get index() {
        return this._index;
    }

    /**
     * Set the Test's index.
     * @param {number} value - test index
     */
    set index(value) {
        this._index = value;
    }

    /**
     * Get the Test's tags.
     * @return {number} The test tags.
     */
    get tags() {
        return this._tags;
    }

    /**
     * Set the Test's tags.
     * @param {Array} value - test tags
     */
    set tags(value) {
        this._tags = value;
    }

    /**
     * Indicates if this test uses goto
     * @return {boolean} true if it includes goto, false if not.
     */
    get hasGoto() {
        return this.interactions.find(interaction => interaction.hasGoto);
    }

    /**
     * Indicates if this test uses exit
     * @return {boolean} true if it includes exit, false if not.
     */
    get hasExit() {
        return this.interactions.find(interaction => interaction.hasExit);
    }

    /**
     * Returns true if at least one of the interactions have operator "==" or "=~"
     * @return {boolean}
     */
    get hasDeprecatedOperators() {
        return this.interactions.some(interaction => interaction.hasDeprecatedOperators);
    }

    /**
     * Returns true if at least one of the interactions have operator ">", ">=", "<" and "<="
     * @return {boolean}
     */
    get hasDeprecatedE2EOperators() {
        return this.interactions.some(interaction => interaction.hasDeprecatedE2EOperators);
    }

    /**
     * Get the Test's interactions.
     * @return {TestInteraction[]} The test's interactions.
     */
    get interactions() {
        return this._interactions;
    }

    /****
     * If true this will be the only test to run.
     * @return {boolean} true if only flag is active, false if not.
     */
    get only() {
        return this._only;
    }

    /**
     * If set to true this will be the only test to run.
     * @param {boolean} only - only flag
     */
    set only(only) {
        this._only = only;
    }

    /****
     * If true this test will be skipped
     * @return {boolean} true if skip flag is active, false if not.
     */
    get skip() {
        return this._skip;
    }

    /**
     * If set to true this test will be skipped
     * @param {boolean} skip - skip flag
     */
    set skip(skip) {
        this._skip = skip;
    }

    /**
     * Returns the complete test suite
     * @return {TestSuite} the test suite
     */
    get testSuite() {
        return this._testSuite;
    }

    /**
     *  Make sure all any goto statements work
     * @return {boolean} Returns true if all goto have a matching utterance
     * @throws {ParserError} Throws a Parser Error if any goto doesn't have a matching utterance
     */
    validate() {
        for (const interaction of this.interactions) {
            for (const assertion of interaction.assertions) {
                if (assertion.goto) {
                    let matched = false;
                    for (const i2 of this.interactions) {
                        if (i2.utterance === assertion.goto || i2.label == assertion.goto) {
                            matched = true;
                            break;
                        }
                    }

                    if (!matched) {
                        throw ParserError.error(this.testSuite.fileName,
                            "No match for goto: " + assertion.goto,
                            assertion.lineNumber);
                    }
                }
            }
        }
        return true;
    }

    /**
     * Returns a non-circular DTO version of this Test
     * @return {object} a DTO including the description and interactions
     */
    toDTO() {
        return {
            description: this.description,
            interactions: this.interactions.map(interaction => interaction.toDTO()),
            only: this.only,
            skip: this.skip,
        };
    }

    /**
     * Returns the test as a yaml object
     * { name: string, interaction:s object[]}
     * @return {object}
    */
    toYamlObject() {
        return {
            interactions: this.interactions.map(interaction => interaction.toYamlObject()),
            name: this.description,
            only: this.only,
            skip: this.skip,
            tags: this.tags,
        };
    }
}

module.exports = Test;

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
    }


    /**
     * Get the Test's description.
     * @return {string} The test description.
     */
    get description() {
        return this._description;
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
        };
    }

    /**
     * Returns the test as a yaml object
     * @return { name: string, interaction:s object[]}
    */
    toYamlObject() {
        return {
            interactions: this.interactions.map(interaction => interaction.toYamlObject()),
            name: this.description,
        };
    }
}

module.exports = Test;
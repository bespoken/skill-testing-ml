// Framework errors are errors that are not coming from skill code
// Instead, they are coming from the skill tester - for these, we want to display them differently
//  in our output
// Specifically, we do not want to show stack traces and we want to add a different prefix to the message
module.exports = class FrameworkError extends Error {
    constructor(message) {
        super(message);
    }
}
	
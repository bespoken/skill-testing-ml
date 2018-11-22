
module.exports = class SMAPIInvoker extends Invoker {
	before(testSuite) {
	}

	afterTest() {
        // Always end the session after a test - resets the dialog manager
        this._virtualAlexa.context().endSession();
    }

    async invokeBatch(interactions) {
        const responses = [];
        for (const interaction of interactions) {
            const response = await this.invoke(interaction);
            responses.push(response);
        }
        return responses;
	}
	
	async invoke(interaction) {
		
	}
}
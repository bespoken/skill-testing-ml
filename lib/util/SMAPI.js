const debug = require("./Debug");
const HTTP = require("./HTTP");
const Util = require("./Util");

module.exports = class SMAPI {
	constructor(token, skillID, locale) {
		this.skillID = skillID;
		this.token = token;
		this.locale = locale ? locale : "en-US";
	}
	
	headers() {
		return {
			"Accept": "application/json",
			Authorization: this._token,
			"Content-Type": "application/json"
		};
	}

	async refresh() {
		// Implemented according to these docs:
		// https://developer.amazon.com/docs/login-with-amazon/authorization-code-grant.html#using-refresh-tokens
	}

	async simulate(command, newSession) {
		const simulation = new Simulation(this);
		const postResult = await simulation.post(command, newSession);
		let getResult;
		while (!getResult || getResult.status === "IN_PROGRESS") {
			await Util.sleep(1000);
			getResult = await simulation.get(postResult.id);
			debug("RESULT: " + JSON.stringify(getResult, null, 2));
			if (getResult.status !== "IN_PROGRESS") {
				return getResult;
			}
		}
	}
}

class Simulation {
	constructor (smapi) {
		this.smapi = smapi;
	}

	async get(simulationID) {
		const path = "/v1/skills/" + this.smapi.skillID + "/simulations/" + simulationID;

		const getOptions = {
			headers: this.smapi.headers(),
			host: "api.amazonalexa.com",
			method: "GET",
			path: path,
			port: "443"
		};  
	
		const response = await HTTP.get(getOptions);
		debug("MESSAGE: " + response.message.statusCode);
		debug("BODY: " + response.body);
		return JSON.parse(response.body);
	}

	async post(command, newSession = false) {
		const mode = newSession ? "FORCE_NEW_SESSION" : "DEFAULT";
		
		const body = {
			device: {
				locale: this.smapi._locale
			},
			input: {
				content: command
			},
			session: {
				mode: mode,
			},
			
		};

		const path = "/v1/skills/" + this.smapi.skillID + "/simulations";
		const postOptions = {
			headers: this.smapi.headers(),
			host: "api.amazonalexa.com",
			method: "POST",
			path: path,
			port: "443"
		};
		
		const response = await HTTP.post(postOptions, body);
		debug("MESSAGE: " + response.message.statusCode);
		debug("BODY: " + response.body);
		return JSON.parse(response.body);
	}
}
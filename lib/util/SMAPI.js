const HTTP = require("./HTTP");
const Util = require("./Util");

module.exports = class SMAPI {
	constructor(token, skillID, locale) {
		this._skillID = skillID;
		this._token = token;
		this._locale = locale ? locale : "en-US";
	}

	headers() {
		return {
			"Accept": "application/json",
			Authorization: this._token,
			"Content-Type": "application/json"
		};
	}

	get skillID() {
		return this._skillID;
	}

	async simulate(command, newSession) {
		const simulation = new Simulation(this);
		const postResult = await simulation.post(command, newSession);
		while (true) {
			await Util.sleep(1000);
			const getResult = await simulation.get(postResult.id);
			console.log("RESULT: " + JSON.stringify(getResult, null, 2));
			if (getResult.status !== "IN_PROGRESS") {
				return getResult;
			}
		}
	}
}

class Simulation {
	constructor (smapi) {
		this._smapi = smapi;
	}

	get smapi() {
		return this._smapi;
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
		console.log("MESSAGE: " + response.message.statusCode);
		console.log("BODY: " + response.body);
		return JSON.parse(response.body);
	}

	async post(command, newSession = false) {
		const mode = newSession ? "FORCE_NEW_SESSION" : "DEFAULT";
		
		const body = {
			session: {
			  mode: mode,
			},
			input: {
			  content: command
			},
			device: {
			  locale: this._smapi._locale
			}
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
		console.log("MESSAGE: " + response.message.statusCode);
		console.log("BODY: " + response.body);
		return JSON.parse(response.body);
	}
}
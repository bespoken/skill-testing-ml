const debug = require("./Debug");
const fs = require("fs");
const HTTP = require("./HTTP");
const os = require("os");
const path = require("path");
const Util = require("./Util");

module.exports = class SMAPI {
	constructor(token, skillId, locale) {
		this.skillId = skillId;
		this.token = token;
		this.locale = locale ? locale : "en-US";
	}

	static fetchAccessTokenFromConfig() {
		// Retrieves the access token - first tries getting it from the ASK CLI
		const cliConfigFile = path.join(os.homedir(), ".ask/cli_config");
		let accessToken;
		if (fs.existsSync(cliConfigFile)) {
			const cliConfigString = fs.readFileSync(cliConfigFile);
			const cliConfig = JSON.parse(cliConfigString);
			accessToken = cliConfig.profiles.default.token.access_token;
		} else {
			throw new Error("No CLI config file exists");
		}
		return accessToken;
	}
	
	headers() {
		return {
			"Accept": "application/json",
			Authorization: this.token,
			"Content-Type": "application/json"
		};
	}

	async refresh() {
		// Implemented according to these docs:
		// https://developer.amazon.com/docs/login-with-amazon/authorization-code-grant.html#using-refresh-tokens
	}

	async simulate(command, newSession) {
		const simulation = new Simulation(this);
		debug("SMAPI COMMAND: " + command);
		const postResult = await simulation.post(command, newSession);
		if (postResult.message) {
			throw Error(postResult.message);	
		}

		let getResult;
		while (!getResult || getResult.status === "IN_PROGRESS") {
			await Util.sleep(1000);
			getResult = await simulation.get(postResult.id);
			debug("SMAPI RESULT: " + JSON.stringify(getResult, null, 2));
			if (getResult.status !== "IN_PROGRESS") {
				if (getResult.message) {
					throw Error(getResult.message);	
				}
				return getResult;
			}
		}
	}
}

class Simulation {
	constructor (smapi) {
		this.smapi = smapi;
	}

	async get(simulationId) {
		const path = "/v1/skills/" + this.smapi.skillId + "/simulations/" + simulationId;

		const getOptions = {
			headers: this.smapi.headers(),
			host: "api.amazonalexa.com",
			method: "GET",
			path: path,
			port: "443"
		};  
	
		const response = await HTTP.get(getOptions);
		debug("SIMULATION GET MESSAGE: " + response.message.statusCode);
		debug("SIMULATION GET BODY: " + response.body);
		return JSON.parse(response.body);
	}

	async post(command, newSession = false) {
		const mode = newSession ? "FORCE_NEW_SESSION" : "DEFAULT";
		
		const body = {
			device: {
				locale: this.smapi.locale
			},
			input: {
				content: command
			},
			session: {
				mode: mode,
			},
			
		};

		const path = "/v1/skills/" + this.smapi.skillId + "/simulations";
		const postOptions = {
			headers: this.smapi.headers(),
			host: "api.amazonalexa.com",
			method: "POST",
			path: path,
			port: "443"
		};

		const response = await HTTP.post(postOptions, body);
		debug("SIMULATION POST MESSAGE: " + response.message.statusCode);
		debug("SIMULATION POST BODY: " + response.body);
		return JSON.parse(response.body);
	}
}
const _ = require("lodash");
const childProcess = require("child_process");
const debug = require("./Debug");
const fs = require("fs");
const HTTP = require("./HTTP");
const os = require("os");
const path = require("path");
const Util = require("./Util");

module.exports = class SMAPI {
	constructor(token, skillId, locale, askConfigured = false) {
		this.skillId = skillId;
		this.token = token;
		this.locale = locale ? locale : "en-US";
		this.askConfigured = askConfigured;
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

	// Uses the project ask configuration to get the skill id, if possible
	static fetchSkillIdFromConfig() {
		const projectConfigFile = path.join(process.cwd(), ".ask/config.json");
		let skillId;
		if (fs.existsSync(projectConfigFile)) {
			const projectJSONString = fs.readFileSync();
			const projectJSON = JSON.parse(projectJSONString);
			skillId = _.get(projectJSON, "deploy_settings.default.skill_id");
		}
		return skillId;
	}
	
	handleResult(result) {
		if (result.message) {
			// If token has expired, and the ASK CLI is configured, then try to refresh it
			if (result.message.includes("Token is invalid") && this.askConfigured) {
				if (this.refreshFromCLI()) {
					this.token = SMAPI.fetchAccessTokenFromConfig();
					return undefined;
				} else {
					return new Error("Token is invalid an unable to refresh via ASK CLI");
				}
			}
			return new Error(result.message);
		} else {
			return undefined;
		}
	}

	headers() {
		return {
			"Accept": "application/json",
			Authorization: this.token,
			"Content-Type": "application/json"
		};
	}

	refreshFromCLI() {
		const result = childProcess.spawnSync("ask", ["api", "get-skill", "-s", this.skillId], { shell: true });
		/* eslint-disable-next-line no-console */
		console.log("REFRESHING TOKEN FROM CLI. STATUS: " + result.status);
		return (result.status === 0);
	}

	async simulate(command, newSession) {
		const simulation = new Simulation(this);
		debug("SMAPI COMMAND: " + command);
		const postResult = await simulation.post(command, newSession);
		let error = this.handleResult(postResult);
		if (error) {
			throw error;
		}

		let getResult;
		while (!getResult || getResult.status === "IN_PROGRESS") {
			await Util.sleep(1000);
			getResult = await simulation.get(postResult.id);
			debug("SMAPI RESULT: " + JSON.stringify(getResult, null, 2));
			if (getResult.status !== "IN_PROGRESS") {
				error = this.handleResult(getResult);
				if (error) {
					throw error;
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
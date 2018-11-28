const http = require("http");
const https = require("https");

module.exports = class HTTP {
	static async get(options) {
		return new Promise((resolve, reject) => {
			const request = HTTP.request(options, resolve, reject);
			request.end();
		});
	}

    static async post(postOptions, body) {
		return new Promise((resolve, reject) => {
			// Set up the request
			const request = HTTP.request(postOptions, resolve, reject);
		
			// post the data
			const bodyString = JSON.stringify(body);
			request.write(bodyString);
			request.end();
		});
	}

	static request(options, resolve, reject) {
		let httpModule = https;
		if (options.protocol === "http:") {
			httpModule = http;
		}
		const request = httpModule.request(options, (response) => {
			let responseBody = "";
			response.setEncoding("utf8");
			response.on("data", (chunk) => {
				responseBody += chunk;
			});

			response.on("end", () => {
				let responseJSON;
				try {
					responseJSON = JSON.parse(responseBody);
				} catch (e) {
					// Do not worry if we cannot parse response body - just continue
				}
				resolve({ 
					body: responseBody,
					json: responseJSON,
					message: response
				});
			});
		});

		request.on("error", (e) => {
			reject(e);
		});

		return request;
	}
}
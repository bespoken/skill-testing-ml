const https = require("https");

module.exports = class HTTP {
	static async get(options) {
		return new Promise((resolve, reject) => {
			let responseBody = "";
			// Set up the request
			const request = https.request(options, (response) => {
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					console.log('Response: ' + chunk);
					responseBody += chunk;
				});

				response.on("end", () => {
					resolve({ 
						body: responseBody,
						message: response
					});
				});
			});
		
			request.end();
		});
	}

    static async post(postOptions, body) {
		return new Promise((resolve, reject) => {
			let responseBody = "";
			// Set up the request
			const request = https.request(postOptions, (response) => {
				response.setEncoding("utf8");
				response.on("data", (chunk) => {
					console.log('Response: ' + chunk);
					responseBody += chunk;
				});

				response.on("end", () => {
					resolve({ 
						body: responseBody,
						message: response
					});
				});
			});
		
			// post the data
			const bodyString = JSON.stringify(body);
			console.log("REQUEST BODY: " + bodyString);
			request.write(bodyString);
			request.end();
		});
	}
}
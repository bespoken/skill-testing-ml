const {dialogflow, BasicCard} = require("actions-on-google");
const functions = require("firebase-functions")

const app = dialogflow();

app.intent("Default Welcome Intent", (conv) => {
    const speechText = "This is the sample welcome! What would you like?";
    conv.ask(speechText);
});

exports.myFunction = functions.https.onRequest(app);

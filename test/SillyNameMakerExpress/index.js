/* eslint-disable  spellcheck/spell-checker */
/* eslint-disable  quotes */
/* eslint-disable  sort-requires/sort-requires */

'use strict';

const {dialogflow} = require('actions-on-google');
const express = require('express');
const bodyParser = require('body-parser');

// ... app code here

const app = dialogflow();

app.intent('make_name', (conv, {color, number}) => {
    conv.close(`Alright, your silly name is ${color} ${number}! ` +
        `I hope you like it. See you next time.`);
});

const server = express().use(bodyParser.json(), app).listen(3000);

module.exports = server;

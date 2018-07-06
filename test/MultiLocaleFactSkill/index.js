/* eslint-disable  no-console */
/* eslint-disable  spellcheck/spell-checker */
/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  sort-keys */
/* eslint-disable  quotes */
/* eslint-disable  no-extra-semi */

const Alexa = require('ask-sdk-core');
const cookbook = require('./alexa-cookbook.js');

//=========================================================================================================================================
//TODO: The items below this comment need your attention.
//=========================================================================================================================================

  const SKILL_NAME_EN = "English Space Facts";
  const GET_FACT_MESSAGE_EN = 'Here\'s your fact: ';
  const HELP_MESSAGE_EN = 'You can say tell me a space fact, or, you can say exit... What can I help you with?';
  const HELP_REPROMPT_EN = 'What can I help you with?';
  const FALLBACK_MESSAGE_EN = 'The Space Facts skill can\'t help you with that.  It can help you discover facts about space if you say tell me a space fact. What can I help you with?';
  const FALLBACK_REPROMPT_EN = 'What can I help you with?';
  const STOP_MESSAGE_EN = 'Goodbye!';

  const SKILL_NAME_DE = "Weltraumwissen";
  const GET_FACT_MESSAGE_DE = "Hier sind deine Fakten: ";
  const HELP_MESSAGE_DE = "Du kannst sagen, „Nenne mir einen Fakt über den Weltraum“, oder du kannst „Beenden“ sagen... Wie kann ich dir helfen?";
  const HELP_REPROMPT_DE = "Wie kann ich dir helfen?";
  const FALLBACK_MESSAGE_DE = 'Ich kann nicht helfen';
  const FALLBACK_REPROMPT_DE = "Wie kann ich dir helfen?";
  const STOP_MESSAGE_DE = "Auf Wiedersehen!";

  const SKILL_NAME_JP = "日本語版豆知識";
  const GET_FACT_MESSAGE_JP = "知ってましたか？";
  const HELP_MESSAGE_JP = "豆知識を聞きたい時は「豆知識」と、終わりたい時は「おしまい」と言ってください。どうしますか？";
  const HELP_REPROMPT_JP = "どうしますか？";
  const FALLBACK_MESSAGE_JP = '私はあなたにそれを手伝えない';
  const FALLBACK_REPROMPT_JP = "私はあなたにそれを手伝えない";
  const STOP_MESSAGE_JP = "さようなら";

//=========================================================================================================================================
//TODO: Replace this data with your own.  You can find translations of this data at http://github.com/alexa/skill-sample-node-js-fact/lambda/data
//=========================================================================================================================================

const EN_data = [
  'A year on Mercury is just 88 days long.',
  'Despite being farther from the Sun, Venus experiences higher temperatures than Mercury.',
  'Venus rotates counter-clockwise, possibly because of a collision in the past with an asteroid.',
  'On Mars, the Sun appears about half the size as it does on Earth.',
  'Earth is the only planet not named after a god.',
  'Jupiter has the shortest day of all the planets.',
  'The Milky Way galaxy will collide with the Andromeda Galaxy in about 5 billion years.',
  'The Sun contains 99.86% of the mass in the Solar System.',
  'The Sun is an almost perfect sphere.',
  'A total solar eclipse can happen once every 1 to 2 years. This makes them a rare event.',
  'Saturn radiates two and a half times more energy into space than it receives from the sun.',
  'The temperature inside the Sun can reach 15 million degrees Celsius.',
  'The Moon is moving approximately 3.8 cm away from our planet every year.',
];

const DE_data = [
  "Ein Jahr dauert auf dem Merkur nur 88 Tage.",
  "Die Venus ist zwar weiter von der Sonne entfernt, hat aber höhere Temperaturen als Merkur.",
  "Venus dreht sich entgegen dem Uhrzeigersinn, möglicherweise aufgrund eines früheren Zusammenstoßes mit einem Asteroiden.",
  "Auf dem Mars erscheint die Sonne nur halb so groß wie auf der Erde.",
  "Die Erde ist der einzige Planet, der nicht nach einem Gott benannt ist.",
  "Jupiter hat den kürzesten Tag aller Planeten.",
  "Die Milchstraßengalaxis wird in etwa 5 Milliarden Jahren mit der Andromeda-Galaxis zusammenstoßen.",
  "Die Sonne macht rund 99,86 % der Masse im Sonnensystem aus.",
  "Die Sonne ist eine fast perfekte Kugel.",
  "Eine Sonnenfinsternis kann alle ein bis zwei Jahre eintreten. Sie ist daher ein seltenes Ereignis.",
  "Der Saturn strahlt zweieinhalb mal mehr Energie in den Weltraum aus als er von der Sonne erhält.",
  "Die Temperatur in der Sonne kann 15 Millionen Grad Celsius erreichen.",
  "Der Mond entfernt sich von unserem Planeten etwa 3,8 cm pro Jahr."
];

var JP_data = [
  "水星の一年はたった88日です。",
  "金星は水星と比べて太陽より遠くにありますが、気温は水星よりも高いです。",
  "金星は反時計回りに自転しています。過去に起こった隕石の衝突が原因と言われています。",
  "火星上から見ると、太陽の大きさは地球から見た場合の約半分に見えます。",
  "木星の<sub alias='いちにち'>1日</sub>は全惑星の中で一番短いです。",
  "天の川銀河は約50億年後にアンドロメダ星雲と衝突します。",
  "太陽の質量は全太陽系の質量の99.86%を占めます。",
  "太陽はほぼ完璧な円形です。",
  "皆既日食は一年から二年に一度しか発生しない珍しい出来事です。",
  "土星は自身が太陽から受けるエネルギーの2.5倍のエネルギーを宇宙に放出しています。",
  "太陽の内部温度は摂氏1500万度にも達します。",
  "月は毎年3.8cm地球から離れていっています。"
];
//=========================================================================================================================================
//Editing anything below this line might break your skill.
//=========================================================================================================================================

const GetNewFactHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
        && request.intent.name === 'GetNewFactIntent');
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;

    if (locale == "de-DE") {
      const randomFact = cookbook.getRandomItem(DE_data);
      const speechOutput = GET_FACT_MESSAGE_DE + randomFact;

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME_DE, randomFact)
        .getResponse();      
    }
    else if (locale == "en-US" | locale == "en-GB") {
      const randomFact = cookbook.getRandomItem(EN_data);
      const speechOutput = GET_FACT_MESSAGE_EN + randomFact;

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME_EN, randomFact)
        .getResponse();      
    }
    else if (locale == "ja-JP"){
      const randomFact = cookbook.getRandomItem(JP_data);
      const speechOutput = GET_FACT_MESSAGE_JP + randomFact;

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .withSimpleCard(SKILL_NAME_JP, randomFact)
        .getResponse();      
    };
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const locale = handlerInput.requestEnvelope.request.locale;

    if (locale == "de-DE") {
      return handlerInput.responseBuilder
      .speak(HELP_MESSAGE_DE)
      .reprompt(HELP_REPROMPT_DE)
      .getResponse();      
    }
    else if (locale == "en-US" | locale == "en-GB") {
      return handlerInput.responseBuilder
      .speak(HELP_MESSAGE_EN)
      .reprompt(HELP_REPROMPT_EN)
      .getResponse();      
    }
    else if (locale == "ja-JP") {
      return handlerInput.responseBuilder
      .speak(HELP_MESSAGE_JP)
      .reprompt(HELP_REPROMPT_JP)
      .getResponse();
    };

  },
};

const FallbackHandler = {
  // 2018-May-01: AMAZON.FallackIntent is only currently available in en-US locale.
  //              This handler will not be triggered except in that locale, so it can be
  //              safely deployed for any locale.
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {

    const locale = handlerInput.requestEnvelope.request.locale;
    
    if (locale == "de-DE") {
      return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE_DE)
      .reprompt(FALLBACK_REPROMPT_DE)
      .getResponse();      
    }
    else if (locale == "en-US" | locale == "en-GB") {
      return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE_EN)
      .reprompt(FALLBACK_REPROMPT_EN)
      .getResponse();      
    }
    else if (locale == "ja-JP") {
      return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE_JP)
      .reprompt(FALLBACK_REPROMPT_JP)
      .getResponse();
    };
    
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {

    const locale = handlerInput.requestEnvelope.request.locale;
    
    if (locale == "de-DE") {
      return handlerInput.responseBuilder
      .speak(STOP_MESSAGE_DE)
      .getResponse();      
    }
    else if (locale == "en-US" | locale == "en-GB") {
      return handlerInput.responseBuilder
      .speak(STOP_MESSAGE_EN)
      .getResponse();      
    }
    else if (locale == "ja-JP"){
      return handlerInput.responseBuilder
      .speak(STOP_MESSAGE_JP)
      .getResponse();            
    };
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetNewFactHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

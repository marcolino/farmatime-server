const i18next = require("i18next");
const backend = require("i18next-fs-backend");
const i18nextMiddleware = require("i18next-http-middleware");
//const config = require("../config");

// setup I18N
i18next
  .use(backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    debug: false,
    backend: {
      loadPath: __dirname + "/../locales/{{lng}}/{{ns}}.json"
    },
    // TODO: avoid someway using config, to be able to import this file from config
    lng: "en", // default language
    fallbackLng: "it", //config.languages.default,
    preload: [ "it", "en", "fr", ], //config.languages.supported, // preload all supported languages
  })
;

module.exports = i18next;
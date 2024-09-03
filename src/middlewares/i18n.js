const i18next = require("i18next");
const backend = require("i18next-fs-backend");
const i18nextMiddleware = require("i18next-http-middleware");
const config = require("../config");

// setup I18N
i18next
  .use(backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    debug: false,
    backend: {
      loadPath: __dirname + "/../locales/{{lng}}/{{ns}}.json"
    },
    fallbackLng: config.app.i18n.languages.fallback, // fallback language
    preload: Object.keys(config.app.i18n.languages.supported), // preload all supported languages
    detection: {
      order: [ "header" ], // server side we get language always from header
      lookupHeader: "accept-language", // be sure we look up the right header
      //caches: false, // do not cache
    }
  })
;

module.exports = i18next;
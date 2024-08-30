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
    lng: config.app.i18n.languages.initial, // default initial language
    fallbackLng: config.app.i18n.languages.fallback, // fallback language
    preload: Object.keys(config.app.i18n.languages.supported), // preload all supported languages
  })
;

module.exports = i18next;
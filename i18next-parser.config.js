//const CustomHtmlLexer = require("./src/libs/customHtmlLexer");
const CustomEjsLexer = require("./src/libs/customEjsLexer");

module.exports = {
  contextSeparator: "_",
  // key separator used in your translation keys

  createOldCatalogs: true,
  // save the \_old files

  defaultNamespace: "translation",
  // default namespace used in your i18next config

  //defaultValue: "__STRING_NOT_TRANSLATED__",
  defaultValue: (lng, ns, key) => {
    if (lng === "en") { // assume "en" as the default language (the language with which all the strings in code are expressed)
      return key; // use the key itself for the primary language
    }
    return '__STRING_NOT_TRANSLATED__'; // use the placeholder for other languages
  },
  // default value to give to empty keys

  indentation: 2,
  // indentation of the catalog files

  keepRemoved: false,
  // keep keys from the catalog that are no longer in code

  keySeparator: false,
  // key separator used in your translation keys
  // if you want to use plain english keys, separators such as `.` and `:` will conflict;
  // you might want to set `keySeparator: false` and`namespaceSeparator: false`;
  // that way, `t("Status: Loading...")` will not think that there are a namespace and
  // three separator dots for instance
  
  // see below for more details
  lexers: {
    // hbs: ["HandlebarsLexer"],
    // handlebars: ["HandlebarsLexer"],
    // htm: ["HTMLLexer"],
    // html: [CustomEjsHtmlLexer],
    //ejs: [CustomEjsLexer],
    ejs: [CustomEjsLexer],
    // mjs: ["JavascriptLexer"],
    // js: ["JavascriptLexer"], // if you're writing jsx inside .js files, change this to JsxLexer
    // ts: ["JavascriptLexer"],
    // jsx: ["JsxLexer"],
    // tsx: ["JsxLexer"],
    default: ["JavascriptLexer"]
  },

  lineEnding: "auto",
  // control the line ending. See options at https://github.com/ryanve/eol

  locales: ["en", "it", "fr"],
  // an array of the locales in your applications

  namespaceSeparator: false,
  // namespace separator used in your translation keys
  // if you want to use plain english keys, separators such as `.` and `:` will conflict;
  // you might want to set `keySeparator: false` and`namespaceSeparator: false`;
  // that way, `t("Status: Loading...")` will not think that there are a namespace and
  // three separator dots for instance

  output: "src/locales/$LOCALE/$NAMESPACE.json",
  // supports $LOCALE and $NAMESPACE injection
  // supports JSON (.json) and YAML (.yml) file formats
  // where to write the locale files relative to process.cwd()

  input: undefined,
  // an array of globs that describe where to look for source files
  // relative to the location of the configuration file

  reactNamespace: false,
  // for react file, extract the defaultNamespace - https://react.i18next.com/components/translate-hoc.html
  // ignored when parsing a `.jsx` file and namespace is extracted from that file.

  sort: true,
  // whether or not to sort the catalog

  useKeysAsDefaultValue: false,
  // whether to use the keys as the default value; ex. "Hello": "Hello", "World": "World"
  // the option `defaultValue` will not work if this is set to true

  verbose: false
  // display info about the parsing including some stats
};

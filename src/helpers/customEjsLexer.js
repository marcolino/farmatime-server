const EventEmitter = require("events");

class CustomEjsLexer extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
  }

  extract(content) {
    const regex = /{{\s*t\s*['"]([^'"]+)['"]\s*}}/g;
    let match;
    const translations = [];
    while ((match = regex.exec(content)) !== null) {
      translations.push({
        key: match[1],
        context: null,
        line: 0,
        content: match[0]
      });
    }
    return translations;
  }
}

module.exports = CustomEjsLexer;
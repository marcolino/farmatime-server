//const i18n = require("./middlewares/i18n");
const apiName = "MDA";
const appName = "mda";
const currency = "EUR"; // default currency (ISO 4217:2015)
const company = "M.D.A. s.r.l.";
const portPublic = "";
const urlPublic = `https://acme-server-lingering-brook-4120.fly.dev${portPublic}`;
const clientSrc = `../${appName}-client/src`; // client app source relative folder

const config = {
  app: {
    customization: "mda"
  },
  logs: {
    file: "logs/mda.log", // logs and exceptions file
  },
};

module.exports = config;
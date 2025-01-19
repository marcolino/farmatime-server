const ip3country = require("ip3country");
const countryCodeToFlagEmoji = require("country-code-to-flag-emoji");
const { remoteAddress } = require("../helpers/misc");
const emailService = require("../services/email.service");
//const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const testSymbol = "🚧";
const prodSymbol = "🏭";

ip3country.init();


const audit = async ({ req, subject, htmlContent }) => {
  // TODO: `IP: ${remoteAddress(req)}` and `on ${localeDateTime()}` should be set by audit function internally, everywhere we use audit() ...
  // TODO: add a library to show country from IP
  // TODO: add a "mode" param to audit ("action", "warning", "error"), to be reflected with colors in body and emoticon in subject

  let modeSymbol = "";
  if (config.mode.development) {
    modeSymbol = testSymbol;
  } else {
    modeSymbol = prodSymbol;
  }
  
  // lookup country from IPv4 string
  const remoteCountry = ip3country.lookupStr(remoteAddress(req)); // TODO...

  // lookup flag from country string
  const remoteFlagEmoji = countryCodeToFlagEmoji(remoteCountry);
  
  let modeText = ""
  switch (mode) {
    case "action":
      modeText = `<span color="green"> [ACTION] </span>`;
      break;
    case "warning":
      modeText = `<span color="orange"> [WARNING] </span>`;
      break;
    case "error":
      modeText = `<span color="darkred"> [ERROR] </span>`;
      break;
    case "":
      modeText = ``;
      break;
    default:
      modeText = `<span color="blue"> [${mode}] </span>`;      
      break;
  }

  const to = config.email.support.to;
  const toName = config.email.support.toName;
  subject = `${(config.email.subject.prefix ? config.email.subject.prefix + " - " : "")}${subject}`;
  htmlContent = htmlContent.replaceAll("\n", "<br />\n")
  await emailService.send(req, { to, toName, subject, htmlContent });
};

const notification = async({ req, to, subject, htmlContent }) => {
  to = to ?? config.email.administration.to;
  subject = `${config.email.subject.prefix ? config.email.subject.prefix + " - " : ""} ${subject}`;

  await emailService.send(req, { to, subject, htmlContent });
};

module.exports = {
  audit,
  notification,
};

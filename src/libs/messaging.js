const ip3country = require("ip3country");
const { remoteAddress, countryCodeToFlag, localeDateTime } = require("../libs/misc");
const emailService = require("../services/email.service");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

ip3country.init();


const audit = async ({ req, mode, subject, htmlContent }) => {
  logger.info(`Audit: subject: ${subject}, contents: ${htmlContent}`);

  if (!config.mode.production) { // not in production mode, ignore real auditing
    return;
  }

  const baseUrl = config.baseUrl;

  // get remote IP address
  const address = remoteAddress(req);

  // lookup country from IPv4 string
  const remoteCountry = ip3country.lookupStr(address) ?? "local";

  // lookup flag from country string
  const remoteFlag = countryCodeToFlag(remoteCountry);

  let actionColor, actionSymbol;
  switch (mode) {
  case "action":
    actionColor = "darkgreen";
    actionSymbol = "🟢";
    break;
  case "warning":
    actionColor = "darkorange";
    actionSymbol = "🟠";
    break;
  case "error":
    actionColor = "darkred";
    actionSymbol = "🔴";
    break;
  case "scheduler":
    actionColor = "darkpurple";
    actionSymbol = "🟣";
    break;
  case "webhook":
    actionColor = "darkbrown";
    actionSymbol = "🟤";
    break;
  case "":
    actionColor = "darkgray";
    actionSymbol = "⚫";
    break;
  default:
    actionColor = "darkblue";
    actionSymbol = "🔵";
    break;
  }
  const fontFamily = "Courier";
  const bodyFontSize = "16px";
  const bodyFontWeight = "bold";
  const bodyColor = actionColor;
  const footerFontSize = "12px";
  const footerFontWeight = "normal";
  const footerColor = "gray";

  const to = config.email.administration.to;
  const toName = config.email.support.toName;
  subject = `${(config.email.subject.prefix ? "[" + config.email.subject.prefix + "]" : " ")} ${actionSymbol} ${subject}`;
  htmlContent = `
    <div style="font-family: ${fontFamily};">
      <div style="font-size: ${bodyFontSize}; font-sweight: ${bodyFontWeight}; color: ${bodyColor}">
        ${htmlContent}
      </div>
      <br />
      <br />
      <div style="font-size: ${footerFontSize}; font-sweight: ${footerFontWeight}; color: ${footerColor}">
        Environment is
        ${
  config.mode.development ? "development" :
    config.mode.production ? "production" :
      config.mode.staging ? "staging" :
        config.mode.test ? "test" :
          "unknown"
}.
        request for url ${baseUrl} from IP ${remoteAddress(req)}, country ${remoteCountry} ${remoteFlag} at ${localeDateTime() }
      </div>
    </div>
  `;
  await emailService.send(req, { to, toName, subject, htmlContent });
};

const notification = async ({ req, to, subject, htmlContent }) => {
  to = to ?? config.email.support.to;
  subject = `${config.email.subject.prefix ? config.email.subject.prefix + " - " : ""} ${subject}`;

  await emailService.send(req, { to, subject, htmlContent });
};

module.exports = {
  audit,
  notification,
};

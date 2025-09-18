const ip3country = require("ip3country");
const { remoteAddress, countryCodeToFlag, localeDateTime } = require("../libs/misc");
const emailService = require("../services/email.service");
const config = require("../config");

ip3country.init();


const audit = async ({ req, mode, subject, htmlContent }) => {
  if (config.mode.test) { // in test mode, just a console.info
    //console.info(`Audit test environment, subject: ${subject}, contents: ${htmlContent}`);
    return;
  }

  // set "mode" symbol (dev/prod)
  const modeSymbol =
    config.mode.development ? "🚧" :
      config.mode.staging ? "🌐" :
        config.mode.production ? "" : //"🚀" :
          "�"
    // eslint-disable-line indent -- unforeseen mode
  ;
  
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

  const to = config.email.support.to;
  const toName = config.email.support.toName;
  subject = `${(config.email.subject.prefix ? "[" + config.email.subject.prefix + "]" + " " + modeSymbol : " ")} ${actionSymbol} ${subject}`;
  htmlContent = `
    <div style="font-family: ${fontFamily};">
      <div style="font-size: ${bodyFontSize}; font-sweight: ${bodyFontWeight}; color: ${bodyColor}">
        ${htmlContent}
      </div>
      <br />
      <br />
      <div style="font-size: ${footerFontSize}; font-sweight: ${footerFontWeight}; color: ${footerColor}">
        Environment is ${config.mode.development ? "development" : "production"}, staging mode is ${config.mode.staging ? "true" : "false"}, request for url ${baseUrl} from IP ${remoteAddress(req)}, country ${remoteCountry} ${remoteFlag} at ${localeDateTime()}
      </div>
    </div>
  `;
  //htmlContent = htmlContent.replaceAll("\n", "<br />\n")
  await emailService.send(req, { to, toName, subject, htmlContent });
};

const notification = async ({ req, to, subject, htmlContent }) => {
  to = to ?? config.email.administration.to;
  subject = `${config.email.subject.prefix ? config.email.subject.prefix + " - " : ""} ${subject}`;

  await emailService.send(req, { to, subject, htmlContent });
};

module.exports = {
  audit,
  notification,
};

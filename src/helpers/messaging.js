const emailService = require("../services/email.service");
//const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const audit = async({ req, subject, htmlContent }) => {
  const to = config.email.administration.to;
  const toName = config.email.administration.toName;
  subject = `${(config.email.subject.prefix ? config.email.subject.prefix + " - " : "")}${subject}`;
  
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

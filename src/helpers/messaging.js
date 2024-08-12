//const sgMail = require("@sendgrid/mail");
const emailService = require("../services/email.service");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const audit = async ({ subject, htmlContent }) => {
  const to = config.email.administration.to;
  const toName = config.email.administration.toName;
  subject = `${config.email.subject.prefix ? config.email.subject.prefix + " - " : ""} ${subject}`;
  
  if (process.env.NODE_ENV !== "production") { // just log audit in development
     logger.info("audit:", { to, subject, htmlContent })
  } else { // really notify via email only in production
    await emailService.send({ to, toName, subject, htmlContent });
  }
};

const notification = async ({ to, subject, htmlContent }) => {
  to = to ?? config.email.administration.to;
  subject = `${config.email.subject.prefix ? config.email.subject.prefix + " - " : ""} ${subject}`;
  
  if (process.env.NODE_ENV !== "production") { // just log audit in development
     logger.info("notification:", { to, subject, htmlContent })
  } else { // really notify via email only in production
    await emailService.send({ to, subject, htmlContent });
  }
};

module.exports = {
  audit,
  notification,
};

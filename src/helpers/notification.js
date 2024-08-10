const sgMail = require("@sendgrid/mail");
const config = require("../config");

const setupEmail = () => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = (mailOptions) => {
  if (process.env.NODE_ENV === "test") { // in test mode do not send emails
    return Promise.resolve(true);
  }

  // set defaults
  if (!mailOptions.to) mailOptions.to = process.env.FROM_EMAIL;
  if (!mailOptions.from) mailOptions.from = process.env.FROM_EMAIL;

  mailOptions.subject = `${config.api.name}${mailOptions.subject ? " ~ " : ""}${mailOptions.subject}`;
  return new Promise((resolve, reject) => {
    sgMail.send(mailOptions, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
  });
};

const notification = async({subject, html}) => {
  if (process.env.NODE_ENV === "production") { // notify only in production
    html = html ? html : subject;
    const to = config.emailAdministration.to;
    const from = config.emailAdministration.from;
    try {
      return await sendEmail({to, from, subject, html});
    } catch(err) {
      logger.error("Error sending email:", err.response?.body?.errors, err);
    }
  }
  return null;
};

const assertionsCheckFailure = async(html) => {
  return notification({subject: "Assertion check failed", html});
};

module.exports = {
  setupEmail,
  sendEmail,
  notification,
  assertionsCheckFailure,
};

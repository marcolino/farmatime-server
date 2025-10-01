const emailService = require("../services/email.service");
const { nextError } = require("../libs/misc");
const config = require("../config");

const ping = async (req, res) => {
  res.status(200).json({ message: "👍" });
};

const sendTestEmail = async (req, res, next) => {
  if (config.mode.production) {
    return nextError(next, req.t("Method not available in production"), 404);
  }
    
  try {
    await emailService.sendWithTemplate(req, {
      to: "marcosolari@gmail.com",
      toName: "Farmaperte Administrator",
      subject: "TEST SUBJECT 1",
      templateName: "test",
      templateParams: {
        userFirstName: "Marco",
        orderNumber: 123,
      }
    });
    res.send(true);
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

module.exports = {
  ping,
  sendTestEmail,
};

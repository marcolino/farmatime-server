const emailService = require("../services/email.service");
const config = require("../config");

const sendTestEmail = async(req, res, next) => {
  try {
    await emailService.send(req, {
      to: "marcosolari@gmail.com",
      toName: "ACME Administrator",
      subject: "TEST SUBJECT 1",
      templateName: "test",
      templateParams: {
        userFirstName: "Marco",
        orderNumber: 123,
      }
    });
    res.send(true);
  } catch (err) {
    const error = new Error(err.message);
    error.status = 500;
    next(error);
  };
};

module.exports = {
  sendTestEmail,
};

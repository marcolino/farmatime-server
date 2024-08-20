const emailService = require("../services/email.service");
const config = require("../config");

const sendTestEmail = async(req, res, next) => {
  try {
    req.language = "it"; // TODO: REMOVEME (force italian language also for english browsers)
    await emailService.send(req, {
      to: "marcosolari@gmail.com",
      toName: "ACME Administrator",
      subject: "TEST SUBJECT 1",
      templateFilename: "generic",
      language: "it",
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

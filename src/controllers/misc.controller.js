const emailService = require("../services/email.service");
const config = require("../config");

const sendEmail = (req, res) => {
  try {
    req.language = "it"; // TODO: REMOVEME (force italian language also for english browsers)
    emailService.send(req, {
      to: "marco.solari@gmail.com",
      toName: "ACME Administrator",
      subject: "TEST SUBJECT 1",
      templateFilename: "generic",
      language: "it",
      templateParams: {
        userFirstName: "Marco",
        name: "John",
        orderNumber: 456,
      }
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error("Error sending email:", err);
  };
  res.send(true);
};

module.exports = {
  sendEmail,
};

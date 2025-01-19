const emailService = require("../services/email.service");

const ping = async(req, res, next) => {
  res.status(200).json({ message: "👍" });
};

// const maintenanceStatus = async(req, res, next) => {
//   res.status(200).json({ message: process.env.MAINTENANCE === "true" ? true : false });
// };

const sendTestEmail = async (req, res, next) => {
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
  ping,
  //maintenanceStatus,
  sendTestEmail,
};

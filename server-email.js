const express = require("express");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
//const i18next = require("i18next");
const i18n = require("./src/middlewares/i18n");
const i18nextMiddleware = require("i18next-http-middleware");
//const backend = require("i18next-fs-backend");
const emailService = require("./src/services/email.service");

const app = express();

// Use i18next middleware
app.use(i18nextMiddleware.handle(i18n/*ext*/));

try {
  emailService.send({
    to: "marco.solari@gmail.com",
    toName: "ACME Administrator",
    subject: "TEST SUBJECT 1",
    templateFilename: "generic_email",
    language: "it",
    templateParams: {
      name: "John"
    }
  });
  console.log("Email sent successfully");
} catch (err) {
  console.error("Error sending email:", err);
};

// Route to demonstrate the rendering
app.get("/send-email", (req, res) => {
  try {
    emailService.send({
      to: "marco.solari@gmail.com",
      toName: "ACME Administrator",
      subject: "TEST SUBJECT 1",
      templateFilename: "generic_email",
      language: "it",
      templateParams: {
        name: "John"
      }
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error("Error sending email:", err);
  };
  res.send(true);
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

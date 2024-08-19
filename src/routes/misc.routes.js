const controller = require("../controllers/misc.controller");
//const emailService = require("../services/email.service");
//const { authJwt } = require("../middlewares");

module.exports = app => {
  app.get("/api/misc/sendEmail", /*authJwt.verifyToken, */controller.sendEmail);
};

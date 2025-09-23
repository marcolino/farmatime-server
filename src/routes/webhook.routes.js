const { verifyRequest } = require("../middlewares");
const controller = require("../controllers/webhook.controller");


const path = "/api/webhook";

module.exports = function(app) {
  app.post(`${path}/brevo`, [verifyRequest.checkBrevoWebhook], controller.brevo);
};

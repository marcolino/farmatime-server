/**
 * Stripe payment routes implementation
 */
const { authJwt } = require("../middlewares");
const controller = require("../controllers/payment.controller");

module.exports = app => {
  app.get("/api/payment/mode", [authJwt.verifyToken], controller.getMode);
  app.post("/api/payment/createCheckoutSession", [authJwt.verifyToken], controller.createCheckoutSession);
  app.get("/api/payment/paymentSuccess", /*[authJwt.verifyToken], */ controller.paymentSuccess);
  app.get("/api/payment/paymentCancel", /*[authJwt.verifyToken], */ controller.paymentCancel);
};

/**
 * Stripe payment routes implementation
 */
const { authJwt } = require("../middlewares");
const controller = require("../controllers/payment.controller");


const path = "/api/payment";

module.exports = app => {
  //app.get(`${path}/mode`, [authJwt.verifyAccessToken], controller.getMode);
  // allow createCheckoutSession also for guest user!
  app.post(`${path}/createCheckoutSession`, [authJwt.verifyAccessTokenAllowGuest], controller.createCheckoutSession);
  app.get(`${path}/paymentSuccess`, controller.paymentSuccess);
  app.get(`${path}/paymentCancel`, controller.paymentCancel);
};

/**
 * Stripe payment routes implementation
 */
const { authJwt } = require("../middlewares");
const PaymentService = require("../services/payment.service");
const config = require("../config");

const path = "/api/payment";

// dynamically load the payment gateway based on config
const paymentService = new PaymentService(config.payment.gateway);

module.exports = app => {
  // allow createCheckoutSession also for guest user!
  app.post(`${path}/createCheckoutSession`, [authJwt.verifyAccessTokenAllowGuest], paymentService.createCheckoutSession.bind(paymentService));
  app.get(`${path}/paymentSuccess`, paymentService.paymentSuccess.bind(paymentService));
  app.get(`${path}/paymentCancel`, paymentService.paymentCancel.bind(paymentService));
};

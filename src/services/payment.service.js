const fs = require("fs");
const path = require("path");
const i18n = require("../middlewares/i18n");
const config = require("../config");

class PaymentService {
  constructor(gatewayName) {
    this.gatewayName = gatewayName;
    this.gateway = this.loadPaymentGateway(gatewayName);
    this.gateway.init();
  }
  
  loadPaymentGateway(gatewayName) {
    try {
      // dynamically require the gateway module based on the name
      const gatewayPath = path.join(__dirname, "..", "gateways", `${gatewayName}.payment.gateway.js`);
      if (!fs.existsSync(gatewayPath)) {
        throw new Error(`Payment gateway "${gatewayPath}" not found`);
      }
      const GatewayClass = require(gatewayPath);
      return new GatewayClass(config);
    } catch (err) {
      throw new Error(i18n.t("Failed to load payment gateway") + " " + gatewayName + ": " + err.message);
    }
  }

  async createCheckoutSession(req, res, next) {
    try {
      return await this.gateway.createCheckoutSession(req, res, next);
    } catch (err) {
      throw err;
    }
  }

  async paymentSuccess(req, res, next) {
    try {
      return await this.gateway.paymentSuccess(req, res, next);
    } catch (err) {
      throw err;
    }
  }

  async paymentCancel(req, res, next) {
    try {
      return await this.gateway.paymentCancel(req, res, next);
    } catch (err) {
      throw err;
    }
  }

}

module.exports = PaymentService;

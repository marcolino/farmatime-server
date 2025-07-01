class AbstractPaymentGateway {
  constructor() {
    if (this.constructor === AbstractPaymentGateway) {
      throw new Error("Cannot instantiate abstract class");
    }
    this.client = null;
    //this.config = config;
  }

  init() {
    throw new Error("init() not implemented");
  }

  // Abstract methods (must be implemented by subclasses)
  async createCheckoutSession(/*req, res, next*/) {
    throw new Error("createCheckoutSession() not implemented");
  }

  async paymentSuccess(/*req, res, next*/) {
    throw new Error("paymentSuccess() not implemented");
  }

  async paymentCancel(/*req, res, next*/) {
    throw new Error("paymentCancel() not implemented");
  }

  // optional shared method (can be overridden)
  // formatCurrency(amount) {
  //   return (amount / 100).toFixed(2);
  // }
}

module.exports = AbstractPaymentGateway;

const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");

const AbstractPaymentGateway = require("../../src/gateways/Abstract.payment.gateway");

describe("Abstract payment gateway", () => {
  describe("constructor", () => {
    it("should throw an error when trying to instantiate directly", () => {
      expect(() => new AbstractPaymentGateway()).to.throw(Error, "Cannot instantiate abstract class");
    });

    it("should not throw an error when instantiating a subclass", () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      expect(() => new ConcretePaymentGateway()).to.not.throw();
    });

    it("should initialize client to null", () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      const gateway = new ConcretePaymentGateway();
      expect(gateway.client).to.be.null;
    });
  });

  describe("init", () => {
    it("should throw an error if not implemented in a subclass", () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      const gateway = new ConcretePaymentGateway();
      expect(() => gateway.init()).to.throw(Error, "init() not implemented");
    });

    it("should not throw an error if implemented in a subclass", () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {
        init() {}
      }
      const gateway = new ConcretePaymentGateway();
      expect(() => gateway.init()).to.not.throw();
    });
  });

  describe("createCheckoutSession", () => {
    it("should throw an error if not implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      let errorCaught = null;
      try {
        await gateway.createCheckoutSession(req, res, next);
      } catch (error) {
        errorCaught = error;
      }
      expect(errorCaught).to.be.an("error");
      expect(errorCaught.message).to.equal("createCheckoutSession() not implemented");
      expect(next.notCalled).to.be.true;
    });

    it("should not throw an error if implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {
        async createCheckoutSession(req, res, next) {
          // implementation here
        }
      }
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      await expect(async () => {
        await gateway.createCheckoutSession(req, res, next);
      }).to.not.throw();
    });
  });

  describe("paymentSuccess", () => {
    it("should throw an error if not implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      let errorCaught = null;
      try {
        await gateway.paymentSuccess(req, res, next);
      } catch (error) {
        errorCaught = error;
      }
      expect(errorCaught).to.be.an("error");
      expect(errorCaught.message).to.equal("paymentSuccess() not implemented");
      expect(next.notCalled).to.be.true;
    });

    it("should not throw an error if implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {
        async paymentSuccess(req, res, next) {
          // implementation here
        }
      }
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      await expect(async () => {
        await gateway.paymentSuccess(req, res, next);
      }).to.not.throw();
    });
  });

  describe("paymentCancel", () => {
    it("should throw an error if not implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {}
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      let errorCaught = null;
      try {
        await gateway.paymentCancel(req, res, next);
      } catch (error) {
        errorCaught = error;
      }
      expect(errorCaught).to.be.an("error");
      expect(errorCaught.message).to.equal("paymentCancel() not implemented");
      expect(next.notCalled).to.be.true;
    });

    it("should not throw an error if implemented in a subclass", async () => {
      class ConcretePaymentGateway extends AbstractPaymentGateway {
        async paymentCancel(req, res, next) {
          // implementation here
        }
      }
      const gateway = new ConcretePaymentGateway();
      const req = {};
      const res = {};
      const next = sinon.spy();
      await expect(async () => {
        await gateway.paymentCancel(req, res, next);
      }).to.not.throw();
    });
  });
});
const chai = require("chai");
const sinon = require("sinon");
const fs = require("fs");
const path = require("path");
const i18n = require("../../src/middlewares/i18n");
const config = require("../../src/config");
const PaymentService = require("../../src/services/payment.service");

const expect = chai.expect;

describe("PaymentService", function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("constructor", function() {
    it("should load payment 'another' gateway", function() {
      const gatewayName = "another";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);
      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} }");
      const paymentService = new PaymentService(gatewayName);
      expect(paymentService.gateway).to.be.an("object");
      fs.unlinkSync(gatewayPath);
    });

    it("should throw error if gateway not found", function() {
      const gatewayName = "nonExistentGateway";
      expect(() => new PaymentService(gatewayName)).to.throw(Error, i18n.t("Failed to load payment gateway") + " " + gatewayName);
    });
  });

  describe("loadPaymentGateway", function() {
    it("should load gateway module", function() {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);
      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} }");
      const paymentService = new PaymentService("testGateway");
      const gateway = paymentService.loadPaymentGateway(gatewayName);
      expect(gateway).to.be.an("object");
      fs.unlinkSync(gatewayPath);
    });

    it("should throw error if gateway file does not exist", function() {
      const gatewayName = "nonExistentGateway";
      expect(() => new PaymentService(gatewayName)).to.throw(Error, i18n.t("Failed to load payment gateway") + " " + gatewayName);
    });
  });

  describe("createCheckoutSession", function() {
    it("should call gateway's createCheckoutSession", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);
      //console.log("gatewayPath:", gatewayPath);

      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async createCheckoutSession(req, res, next) { return \"success\"; } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      // const fileContent = fs.readFileSync(gatewayPath, 'utf8');
      // console.log("fileContent:", fileContent);
      
      const paymentService = new PaymentService(gatewayName);
      //console.log("paymentService.gateway:", paymentService.gateway);
      const req = {}, res = {}, next = sandbox.stub();
      
      paymentService.createCheckoutSession(req, res, next).then(result => {
        fs.unlinkSync(gatewayPath);
        expect(result).to.equal("success");
        done();
      }).catch(err => done(err));
    });

    it("should throw error if gateway's createCheckoutSession fails", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);
      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async createCheckoutSession(eq, res, next) { throw new Error(\"Gateway error\"); } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      const paymentService = new PaymentService(gatewayName);
      const req = {}, res = {}, next = sandbox.stub();
      
      paymentService.createCheckoutSession(req, res, next).then(() => {
        done(new Error("Expected method to reject."));
      }).catch(err => {
        fs.unlinkSync(gatewayPath);
        expect(err.message).to.equal("Gateway error");
        done();
      });
    });
  });

  describe("paymentSuccess", function() {
    it("should call gateway's paymentSuccess", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);
      
      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async paymentSuccess(req, res, next) { return \"success\"; } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      const paymentService = new PaymentService(gatewayName);
      const req = {}, res = {}, next = sandbox.stub();

      paymentService.paymentSuccess(req, res, next).then(result => {
        fs.unlinkSync(gatewayPath);
        expect(result).to.equal("success");
        done();
      }).catch(err => done(err));
    });

    it("should throw error if gateway's paymentSuccess fails", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);

      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async paymentSuccess(req, res, next) { throw new Error(\"Gateway error\"); } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      const paymentService = new PaymentService(gatewayName);
      const req = {}, res = {}, next = sandbox.stub();

      paymentService.paymentSuccess(req, res, next).then(() => {
        done(new Error("Expected method to reject."));
      }).catch(err => {
        fs.unlinkSync(gatewayPath);
        expect(err.message).to.equal("Gateway error");
        done();
      });
    });
  });

  describe("paymentCancel", function() {
    it("should call gateway's paymentCancel", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);

      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async paymentCancel(req, res, next) { return \"success\"; } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      const paymentService = new PaymentService(gatewayName);
      const req = {}, res = {}, next = sandbox.stub();

      paymentService.paymentCancel(req, res, next).then(result => {
        fs.unlinkSync(gatewayPath);
        expect(result).to.equal("success");
        done();
      }).catch(err => done(err));
    });

    it("should throw error if gateway's paymentCancel fails", function(done) {
      const gatewayName = "testGateway";
      const gatewayPath = path.join(__dirname, "..", "..", "src", "gateways", `${gatewayName}.payment.gateway.js`);

      fs.writeFileSync(gatewayPath, "module.exports = class TestGateway { constructor(config) {} init() {} async paymentCancel(req, res, next) { throw new Error(\"Gateway error\"); } }");
      delete require.cache[require.resolve(gatewayPath)]; // delete node.js cache

      const paymentService = new PaymentService(gatewayName);
      const req = {}, res = {}, next = sandbox.stub();

      paymentService.paymentCancel(req, res, next).then(() => {
        done(new Error("Expected method to reject."));
      }).catch(err => {
        fs.unlinkSync(gatewayPath);
        expect(err.message).to.equal("Gateway error");
        done();
      });
    });
  });
});

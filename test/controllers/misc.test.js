const chai = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const expect = chai.expect;

describe("Misc Controller Tests", () => {
  let nextStub, reqStub, emailServiceStub, configStub, nextErrorStub;

  beforeEach(function() {
    // Stub next function
    nextStub = sinon.stub();

    // Stub req object
    reqStub = {
      t: sinon.stub().returns("Method not available in production")
    };

    // Stub email service
    emailServiceStub = {
      send: sinon.stub()
    };

    // Stub config
    configStub = {
      mode: {
        production: false
      }
    };

    // Stub nextError function
    nextErrorStub = sinon.stub().callsFake((next, message, statusCode, stack) => {
      next({ status: statusCode, message, stack });
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  it("should call nextError with 404 in production mode", () => {
    configStub.mode.production = true;

    const miscController = proxyquire("../../src/controllers/misc.controller", {
      "../services/email.service": emailServiceStub,
      "../config": configStub,
      "../libs/misc": { nextError: nextErrorStub }
    });

    const { sendTestEmail } = miscController;

    sendTestEmail(reqStub, null, nextStub);

    expect(nextStub.calledOnce).to.be.true;
    expect(nextStub.firstCall.args[0].status).to.equal(404);
    expect(nextStub.firstCall.args[0].message).to.equal("Method not available in production");
  });

  it("should call nextError with 500 on email sending error", async () => {
    emailServiceStub.send.rejects(new Error("Email sending failed"));
  
    const miscController = proxyquire("../../src/controllers/misc.controller", {
      "../services/email.service": emailServiceStub,
      "../config": configStub,
      "../libs/misc": { nextError: nextErrorStub }
    });
  
    const { sendTestEmail } = miscController;
  
    await sendTestEmail(reqStub, null, nextStub);
  
    expect(nextStub.calledOnce).to.be.true;
    expect(nextStub.firstCall.args[0].status).to.equal(500);
    // expect(nextStub.firstCall.args[0].message).to.equal("Email sending failed"); // TODO...
  });
});

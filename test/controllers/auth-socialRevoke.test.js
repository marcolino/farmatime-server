const server = require("../server.test");
const { logger } = require("../../src/controllers/logger.controller");
const authController = require("../../src/controllers/auth.controller");


describe("Auth social revoke controller", function () {
  let req, res;

  beforeEach(function () {
    req = {
      body: {
        userId: "12345",
        provider: "google",
        issuedAt: "2025-03-06T12:00:00Z"
      }
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.stub()
    };

    server.sinon.stub(logger, "log");
  });

  afterEach(function () {
    server.sinon.restore();
  });

  // it("should log the revocation request and return a success response", async function () {
  //   await authController.socialRevoke(req, res);

  //   server.expect(logger.log.calledWith("socialRevoke")).to.be.true;
  //   server.expect(logger.log.calledWithMatch(/Access revoked for provider google, user 12345 at/)).to.be.true;
  //   server.expect(res.status.calledWith(200)).to.be.true;
  //   server.expect(res.json.calledWith({
  //     message: "Revocation notification received from provider google for user id 12345"
  //   })).to.be.true;
  // });

  it("should handle missing userId in request body", async function () {
    delete req.body.userId;
    await authController.socialRevoke(req, res);

    server.expect(logger.log.calledWith("socialRevoke")).to.be.true;
    server.expect(res.status.calledWith(200)).to.be.true;
    const jsonResponse = res.json.getCall(0).args[0];
    server.expect(jsonResponse.message).to.match(/^Revocation notification received from provider google for user id undefined/);
  });

  it("should handle missing provider in request body", async function () {
    delete req.body.provider;
    await authController.socialRevoke(req, res);

    server.expect(logger.log.calledWith("socialRevoke")).to.be.true;
    server.expect(res.status.calledWith(200)).to.be.true;
    const jsonResponse = res.json.getCall(0).args[0];
    server.expect(jsonResponse.message).to.match(/^Revocation notification received from provider undefined for user id 12345/);
  });
});

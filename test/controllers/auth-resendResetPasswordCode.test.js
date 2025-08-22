const server = require("../server.test");
// const setup = require("../setup.test");
// const NotificationToken = require("../../src/models/notificationToken.model");
// const i18n = require("../../src/middlewares/i18n");
const User = require("../../src/models/user.model");
// const AccessToken = require("../../src/models/accessToken.model");
// const RefreshToken = require("../../src/models/refreshToken.model");
const authController = require("../../src/controllers/auth.controller");
//const { createTokensAndCookies } = require("../../src/helpers/misc");
const emailService = require("../../src/services/email.service");
// const demoData = require("../../data/demo.js");
// const config = require("../../src/config");


describe("Auth - resendResetPasswordCode", () => {
  let req, res, next, stubFindOne, stubSend;

  beforeEach(() => {
    req = {
      parameters: { email: "valid@example.com" },
      t: (key) => key // mock translation function
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.spy()
    };
    next = server.sinon.spy();
    
    // mock User model
    stubFindOne = server.sinon.stub(User, "findOne");
    
    // mock email service
    stubSend = server.sinon.stub(emailService, "sendWithTemplate");
  });

  afterEach(() => server.sinon.restore());


  it("should reject invalid emails", async () => {
    req.parameters.email = "invalid-email";
    await authController.resendResetPasswordCode(req, res, next);
    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWithMatch({ message: "Please supply a valid email" })).to.be.true;
  });

  it("should generate code and send email for existing user", async () => {
    const mockUser = {
      email: "valid@example.com",
      generatePasswordResetCode: () => ({ code: "123456", expires: Date.now() }),
      save: server.sinon.stub().resolvesThis()
    };
    stubFindOne.resolves(mockUser);
    await authController.resendResetPasswordCode(req, res, next);
    server.expect(mockUser.resetPasswordCode).to.equal("123456");
    server.expect(mockUser.save.calledOnce).to.be.true;
    server.expect(stubSend.calledOnce).to.be.true;
    server.expect(res.status.calledWith(200)).to.be.true;
    server.expect(res.json.args[0][0]).to.include({
      message: "If the account exists, a verification code has been sent to {{email}}",
      codeDeliveryEmail: "valid@example.com"
    });
  });

  it("should handle non-existent users gracefully", async () => {
    stubFindOne.resolves(null);
    await authController.resendResetPasswordCode(req, res, next);
    server.expect(stubSend.notCalled).to.be.true;
    server.expect(res.status.calledWith(200)).to.be.true;
    server.expect(res.json.args[0][0]).to.include({
      message: "If the account exists, a verification code has been sent to {{email}}",
    });
  });

  it("should handle database errors", async () => {
    stubFindOne.rejects(new Error("DB connection failed"));
    await authController.resendResetPasswordCode(req, res, next);
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0].message).to.include("Error resending reset password code");
  });
});

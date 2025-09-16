// const { expect } = require("chai");
// const sinon = require("sinon");
// const User = require("./path/to/UserModel"); // Adjust the path
// const emailService = require("./path/to/emailService"); // Adjust the path
// const config = require("./path/to/config"); // Adjust the path
// const { resendSignupVerificationCode } = require("./path/to/your/module"); // Adjust the path
const server = require("../server.test");
//const { logger } = require("../../src/controllers/logger.controller");
//const { audit } = require("../../src/libs/messaging");
const User = require("../../src/models/user.model");
const emailService = require("../../src/services/email.service");
//const VerificationCode = require("../../src/models/verificationCode.model");
const authController = require("../../src/controllers/auth.controller");
const config = require("../../src/config");

describe("Auth resend signup verification code controller", () => {
  let req, res, next, stubUserFindOne, stubGenerateVerificationCode, stubVerificationCodeSave, stubEmailServiceSend;

  beforeEach(() => {
    // Mock request, response, and next
    req = {
      parameters: {},
      t: (message) => message, // Mock translation function
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.stub(),
    };
    next = server.sinon.stub();

    // Stub dependencies
    stubUserFindOne = server.sinon.stub(User, "findOne");
    stubGenerateVerificationCode = server.sinon.stub(User.prototype, "generateVerificationCode");
    stubVerificationCodeSave = server.sinon.stub().resolves();
    stubEmailServiceSend = server.sinon.stub(emailService, "sendWithTemplate").resolves();
  });

  afterEach(() => {
    server.sinon.restore();
  });

  it("should return 400 if email is missing", async () => {
    await authController.resendSignupVerificationCode(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "Please specify an email" })).to.be.true;
  });

  it("should return 200 even if user is not found (for security reasons)", async () => {
    req.parameters.email = "nonexistent@example.com";
    stubUserFindOne.resolves(null);

    await authController.resendSignupVerificationCode(req, res, next);
    server.expect(res.status.calledWith(200)).to.be.true;
    server.expect(res.json.calledWith({
      message: "If the account exists, a verification code has been sent to {{to}} via {{codeDeliveryMedium}}",
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      ...(!config.mode.production && !config.mode.staging) && { code: undefined }
    })).to.be.true;
  });

  it("should return 400 if user is already verified", async () => {
    req.parameters.email = "verified@example.com";
    const mockUser = {
      email: "verified@example.com",
      isVerified: true,
    };
    stubUserFindOne.resolves(mockUser);

    await authController.resendSignupVerificationCode(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "This account has already been verified, you can log in" })).to.be.true;
  });

  it("should generate a verification code, save it, send an email, and return 200", async () => {
    req.parameters.email = "unverified@example.com";
    const mockUser = {
      _id: "user-id",
      email: "unverified@example.com",
      firstName: "John",
      lastName: "Doe",
      isVerified: false,
      generateVerificationCode: stubGenerateVerificationCode,
    };
    const mockVerificationCode = {
      code: "123456",
      save: stubVerificationCodeSave,
    };

    stubUserFindOne.resolves(mockUser);
    stubGenerateVerificationCode.resolves(mockVerificationCode);

    await authController.resendSignupVerificationCode(req, res, next);

    // Verify the verification code was generated and saved
    server.expect(stubGenerateVerificationCode.calledWith(mockUser._id)).to.be.true;
    server.expect(stubVerificationCodeSave.calledOnce).to.be.true;

    // Verify the email was sent
    server.expect(stubEmailServiceSend.calledWith(req, {
      to: mockUser.email,
      subject: "Signup Verification Code Resent",
      templateName: "signupVerificationCodeSent",
      templateParams: {
        userFirstName: mockUser.firstName,
        userLastName: mockUser.lastName,
        signupVerificationCode: mockVerificationCode.code,
      },
    })).to.be.true;

    // Verify the response
    server.expect(res.status.calledWith(200)).to.be.true;
    server.expect(res.json.calledWith({
      message: "If the account exists, a verification code has been sent to {{to}} via {{codeDeliveryMedium}}",
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      ...(!config.mode.production && !config.mode.staging && { code: mockVerificationCode.code }), // include code in non-production modes
    })).to.be.true;
  });

  it("should handle errors and return 500", async () => {
    req.parameters.email = "error@example.com";
    const mockError = new Error("Database error");
    stubUserFindOne.rejects(mockError);

    await authController.resendSignupVerificationCode(req, res, next);

    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error resending signup code: {{err}}");
    server.expect(next.args[0][0].status).to.equal(500);
  });
});
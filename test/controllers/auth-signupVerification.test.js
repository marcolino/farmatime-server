const server = require("../server.test");
const { logger } = require("../../src/controllers/logger.controller");
const { audit } = require("../../src/libs/messaging");
const User = require("../../src/models/user.model");
const VerificationCode = require("../../src/models/verificationCode.model");
const authController = require("../../src/controllers/auth.controller");


describe("Auth signup verification controller", () => {
  let req, res, next, stubVerificationCodeFindOne, stubUserFindOne, stubUserSave, stubLoggerInfo, stubAudit;

  beforeEach(() => {
    req = {
      parameters: {},
      t: (key) => key, // mock translation function
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.stub(),
    };
    next = server.sinon.stub();

    // Stub the dependencies
    stubVerificationCodeFindOne = server.sinon.stub(VerificationCode, "findOne");
    stubUserFindOne = server.sinon.stub(User, "findOne");
    stubUserSave = server.sinon.stub(User.prototype, "save");
    stubLoggerInfo = server.sinon.stub(logger, "info");
    stubAudit = server.sinon.stub(audit, "call");
  });

  afterEach(() => {
    server.sinon.restore();
  });

  it("should return 400 if code is missing", async () => {
    await authController.signupVerification(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "Code is mandatory" })).to.be.true;
  });

  it("should return 400 if code is not valid", async () => {
    req.parameters.code = "invalid-code";
    stubVerificationCodeFindOne.resolves(null);

    await authController.signupVerification(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "This code is not valid, it may be expired" })).to.be.true;
  });

  it("should return 400 if user is not found", async () => {
    req.parameters.code = "valid-code";
    stubVerificationCodeFindOne.resolves({ code: "valid-code", userId: "user-id" });
    stubUserFindOne.resolves(null);

    await authController.signupVerification(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "A user for this code was not found" })).to.be.true;
  });

  it("should return 400 if user is already verified", async () => {
    req.parameters.code = "valid-code";
    stubVerificationCodeFindOne.resolves({ code: "valid-code", userId: "user-id" });
    stubUserFindOne.resolves({ _id: "user-id", isVerified: true });

    await authController.signupVerification(req, res, next);

    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "This account has already been verified" })).to.be.true;
  });

  it("should verify and save the user", async () => {
    req.parameters.code = "valid-code";
    const mockCode = { code: "valid-code", userId: "user-id" };
    const mockUser = {
      _id: "user-id",
      isVerified: false,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      save: server.sinon.stub().resolves({
        _id: "user-id",
        isVerified: true,
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
      }),
    };
  
    stubVerificationCodeFindOne.resolves(mockCode);
    stubUserFindOne.resolves(mockUser);
  
    await authController.signupVerification(req, res, next);
  
    // Verify the user was marked as verified
    server.expect(mockUser.isVerified).to.be.true;
  
    // Verify the save method was called
    server.expect(mockUser.save.calledOnce).to.be.true;
  
    // Verify the logger was called
    server.expect(stubLoggerInfo.calledWith(`User signup: ${JSON.stringify(mockUser)}`)).to.be.true;
  
    // Verify the audit function was called
    // server.expect(stubAudit.calledWith({
    //   req,
    //   mode: "action",
    //   subject: "User sign up",
    //   htmlContent: `Sign up of user ${mockUser.firstName} ${mockUser.lastName} (email: ${mockUser.email})`,
    // })).to.be.true;
  
    // Verify the response
    server.expect(res.status.calledWith(200)).to.be.true;
    server.expect(res.json.calledWith({ message: "The account has been verified, you can now log in" })).to.be.true;
  });

  it("should handle error when saving user", async () => {
    req.parameters.code = "valid-code";
    const mockCode = { code: "valid-code", userId: "user-id" };
    const mockUser = { _id: "user-id", isVerified: false, save: () => {} };
    const mockError = new Error("Save error");

    stubVerificationCodeFindOne.resolves(mockCode);
    stubUserFindOne.resolves(mockUser);
    stubUserSave.rejects(mockError);

    await authController.signupVerification(req, res, next);

    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error saving user in signup verification:");
  });

  it("should handle error when finding user", async () => {
    req.parameters.code = "valid-code";
    const mockCode = { code: "valid-code", userId: "user-id" };
    const mockError = new Error("Find user error");

    stubVerificationCodeFindOne.resolves(mockCode);
    stubUserFindOne.rejects(mockError);

    await authController.signupVerification(req, res, next);

    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error finding user in signup verification:");
  });

  it("should handle error when verifying signup", async () => {
    req.parameters.code = "valid-code";
    const mockError = new Error("Verification error");

    stubVerificationCodeFindOne.rejects(mockError);

    await authController.signupVerification(req, res, next);

    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error verifying signup:");
  });
});
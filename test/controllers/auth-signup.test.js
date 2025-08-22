// const mongoose = require("mongoose");
// const { ObjectId } = mongoose.Types;
const validateEmail = require("email-validator");
const server = require("../server.test");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const Plan = require("../../src/models/plan.model");
const { logger } = require("../../src/controllers/logger.controller");
const { normalizeEmail } = require("../../src/helpers/misc");
const emailService = require("../../src/services/email.service");
const authController = require("../../src/controllers/auth.controller");
//const config = require("../../src/config");


describe("Auth signup controller", () => {
  let req, res, next;
  let roleStub, planStub, userStub, emailStub;

  beforeEach(() => {
    req = {
      parameters: {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      },
      t: (msg, vars) => msg.replace(/{{(\w+)}}/g, (_, v) => vars[v]),
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.stub(),
    };
    next = server.sinon.stub();

    server.sinon.stub(validateEmail, "validate").returns(true);
    //server.sinon.stub(normalizeEmail).returns("normalized@example.com");
    server.sinon.stub().callsFake(normalizeEmail);
    roleStub = server.sinon.stub(Role, "findOne");
    planStub = server.sinon.stub(Plan, "findOne");
    userStub = server.sinon.stub(User.prototype, "save").resolves();
    emailStub = server.sinon.stub(emailService, "sendWithTemplate").resolves();
    server.sinon.stub(logger, "error");
  });

  afterEach(() => {
    server.sinon.restore();
  });

  it("should return 400 if email is invalid", async () => {
    validateEmail.validate.returns(false);
    await authController.signup(req, res, next);
    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "Please supply a valid email" })).to.be.true;
  });

  it("should return 500 if role lookup fails", async () => {
    roleStub.rejects(new Error("DB error"));
    await authController.signup(req, res, next);
    // server.expect(res.status.calledWith(500)).to.be.true;
    // server.expect(res.json.called).to.be.true;
    server.expect(next.called).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.instanceOf(Error);
    server.expect(next.firstCall.args[0].status).to.equal(500);
  });

  it("should return 400 if role is not found", async () => {
    roleStub.resolves(null);
    await authController.signup(req, res, next);
    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "Invalid role name user" })).to.be.true;
  });

  it("should return 500 if plan lookup fails", async () => {
    roleStub.resolves({ _id: "roleId" });
    planStub.rejects(new Error("DB error"));
    await authController.signup(req, res, next);
    server.expect(next.called).to.be.true;
  });

  it("should return 400 if plan is not found", async () => {
    roleStub.resolves({ _id: "roleId" });
    planStub.resolves(null);
    await authController.signup(req, res, next);
    server.expect(res.status.calledWith(400)).to.be.true;
    server.expect(res.json.calledWith({ message: "Invalid plan name free" })).to.be.true;
  });

  it("should return 500 if user save fails", async () => {
    roleStub.resolves({ _id: "roleId" });
    planStub.resolves({ _id: "planId" });
    userStub.rejects(new Error("User save error"));
    await authController.signup(req, res, next);
    server.expect(next.called).to.be.true;
  });

  it("should send verification email and return 201 on success", async () => {
    const verificationCode = { code: "123456", save: server.sinon.stub().resolves() };
    server.sinon.stub(User.prototype, "generateVerificationCode").returns(verificationCode);
    roleStub.resolves({ _id: "roleId" });
    planStub.resolves({ _id: "planId" });
    await authController.signup(req, res, next);
    server.expect(emailStub.called).to.be.true;
    server.expect(res.status.calledWith(201)).to.be.true;
    server.expect(res.json.calledWithMatch({ message: "A verification code has been sent to test@example.com" })).to.be.true;
  });
});

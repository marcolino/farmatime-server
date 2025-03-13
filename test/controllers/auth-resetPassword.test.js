const chai = require("chai");
const sinon = require("sinon");
const { expect } = chai;
const User = require("../../src/models/user.model");
const emailService = require("../../src/services/email.service");
const authController = require("../../src/controllers/auth.controller"); // Adjust path as necessary

describe("Auth - resetPassword", () => {
  let req, res, next, stubFindOne, stubSend;

  beforeEach(() => {
    req = {
      parameters: { email: "valid@example.com" },
      t: (key) => key // Mock translation function
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    next = sinon.spy();

    // Stub User model's findOne method
    stubFindOne = sinon.stub(User, "findOne");
    // Stub email service's send method
    stubSend = sinon.stub(emailService, "send");
  });

  afterEach(() => {
    sinon.restore(); // Restore all stubs after each test
  });

  it("should return 400 if no email is provided", async () => {
    req.parameters.email = null; // No email provided
    await authController.resetPassword(req, res, next);
    
    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWithMatch({ message: "No email address to be reset" })).to.be.true;
  });

  it("should handle non-existent users gracefully", async () => {
    stubFindOne.resolves(null); // Simulate user not found

    await authController.resetPassword(req, res, next);

    expect(res.status.calledWith(200)).to.be.true; // Should still respond with a success message
    expect(res.json.calledOnce).to.be.true;
  });

  it("should generate reset password code and send email for existing user", async () => {
    const mockUser = {
      email: "valid@example.com",
      generatePasswordResetCode: () => ({ code: "123456", expires: Date.now() + 3600000 }), // Mock method
      save: sinon.stub().resolvesThis() // Mock save method
    };

    stubFindOne.resolves(mockUser); // Simulate user found

    await authController.resetPassword(req, res, next);

    expect(mockUser.resetPasswordCode).to.equal("123456"); // Check if code was generated
    expect(mockUser.resetPasswordExpires).to.exist; // Check if expiration was set
    expect(mockUser.save.calledOnce).to.be.true; // Ensure save was called
    expect(stubSend.calledOnce).to.be.true; // Ensure email was sent

    expect(res.status.calledWith(200)).to.be.true; // Check response status
  });

  it("should handle errors during execution", async () => {
    const errorMessage = "Database error";
    
    stubFindOne.rejects(new Error(errorMessage)); // Simulate an error during user lookup

    await authController.resetPassword(req, res, next);

    expect(next.calledOnce).to.be.true; // Ensure next error handler was called
    expect(next.firstCall.args[0].message).to.include("Error resetting password"); // Check error message
  });
});

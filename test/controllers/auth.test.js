/**
 * Auth routes tests
 */

const chai = require("chai");
const chaiHttp = require("chai-http");
const spies = require("chai-spies");
const expect = chai.expect;
//const sinon = require("sinon");
const server = require("../../server");
const User = require("../../src/models/user.model");
//const Role = require("../../src/models/role.model");
const { config } = require("../config.test");
const passepartoutPassword = require("../../src/config").auth.passepartout;

chai.use(chaiHttp); // use chai-http to make the actual HTTP requests
chai.use(spies); // use chai-spies to spy on errors for example
chai.should(); // make the `should` syntax available throughout this module

let accessTokenUser, accessTokenAdmin;

describe("API tests - Auth routes", function() {

  before(async() => { // before these tests we empty the database
    // clearing user collection from test database
    User.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  it("should register user", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send(config.user)
      .then(res => {
        res.should.have.status(201);
        res.body.should.have.property("code");
        signupVerifyCode = res.body.code;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not register user without confirmation", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send(config.user)
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("code");
        expect(res.body.code).to.equal("AccountWaitingForVerification");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not register user with invalid email", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send(config.userInvalidEmail)
      .then(res => {
        res.should.have.status(400);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not register user forcing invalid plan", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send({
        "email": config.admin.email,
        "password": config.admin.password,
        "forceplan": "invalidPlan",
      })
      .then(res => {
        res.should.have.status(400);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not register user forcing invalid role", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send({
        "email": config.admin.email,
        "password": config.admin.password,
        "forcerole": "invalidRole",
      })
      .then(res => {
        res.should.have.status(400);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not login user before confirmation", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": config.user.email,
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("This account is waiting for a verification; if you did register it, check your emails");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should resend register code", function(done) {
    chai.request(server)
      .post("/api/auth/resendSignupCode")
      .send({ email: config.user.email })
      .then(res => {
        res.should.have.status(200);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm user without code", function(done) {
    chai.request(server)
      .post("/api/auth/signupVerification")
      .send({})
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Code is mandatory");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm user with invalid code", function(done) {
    chai.request(server)
      .post("/api/auth/signupVerification")
      .send({ code: "invalid code" })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("This code is not valid, it may be expired");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should confirm user", function(done) {
    chai.request(server)
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCode })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("The account has been verified, you can now log in");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm user twice", function(done) {
    chai.request(server)
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCode })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("This account has already been verified");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not resend register code for already confirmed user", function(done) {
    chai.request(server)
      .post("/api/auth/resendSignupCode")
      .send({ email: config.user.email })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("This account has already been verified, you can log in");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not resend register code without email", function(done) {
    chai.request(server)
      .post("/api/auth/resendSignupCode")
      .send({})
      .then(res => {
        res.should.have.status(401); // 403?
        expect(res.body.message).to.equal("The email address null is not associated with any account. Double-check your email address and try again.");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not reset password without email", function(done) {
    chai.request(server)
      .post("/api/auth/resetPassword")
      .send({})
      .then(res => {
        res.should.have.status(400);
        expect(res.body.message).to.equal("No email address to be reset");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should start reset password", function(done) {
    chai.request(server)
      .post("/api/auth/resetPassword")
      .send({email: config.user.email})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("code");
        resetPasswordCode = res.body.code;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should confirm reset password", function(done) {
    chai.request(server)
      .post("/api/auth/resetPasswordConfirm")
      .send({email: config.user.email, password: config.user.password /*+ "-changed"*/, code: resetPasswordCode})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Your password has been updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm reset password with wrong email", function(done) {
    chai.request(server)
      .post("/api/auth/resetPasswordConfirm")
      .send({email: "wrong@email.com", password: config.user.password, code: resetPasswordCode})
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Password reset code is invalid or has expired");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm reset password with no code", function(done) {
    chai.request(server)
      .post("/api/auth/resetPasswordConfirm")
      .send({email: config.user.email, password: config.user.password})
      .then(res => {
        res.should.have.status(400);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not confirm reset password with wrong code", function(done) {
    chai.request(server)
      .post("/api/auth/resetPasswordConfirm")
      .send({email: config.user.email, password: config.user.password, code: "wrong code"})
      .then(res => {
        res.should.have.status(400);
        expect(res.body.message).to.equal("Password reset code is invalid or has expired");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not resend reset password code to invalid email", function(done) {
    chai.request(server)
      .post("/api/auth/resendResetPasswordCode")
      .send({email: "invalid email"})
      .then(res => {
        res.should.have.status(401); // 403?
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("The email address invalid email is not associated with any account. Double-check your email address and try again.");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should resend reset password code", function(done) {
    chai.request(server)
      .post("/api/auth/resendResetPasswordCode")
      .send({email: config.user.email})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal(`A verification code has been sent to ${config.user.email}`);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not login user with invalid email", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": "invalid email",
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Email is not valid");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not login user with unregistered email", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": "never.registered@email.com",
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("User not found");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should login user", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": config.user.email,
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("id");
        res.body.should.have.property("email");
        res.body.should.have.property("roles");
        res.body.should.have.property("plan");
        res.body.should.have.property("accessToken");
        res.body.should.have.property("refreshToken");
        res.body.should.have.property("id");
        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should login user with passepartout password", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": config.user.email,
        "password": passepartoutPassword,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("id");
        res.body.should.have.property("email");
        res.body.should.have.property("roles");
        res.body.should.have.property("plan");
        res.body.should.have.property("accessToken");
        res.body.should.have.property("refreshToken");
        res.body.should.have.property("id");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not login user with invalid password", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": config.user.email,
        "password": "invalid password",
      })
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Wrong password");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should register admin user", function(done) {
    const admin = config.admin;
    admin.forcerole = "admin";
    chai.request(server)
      .post("/api/auth/signup")
      .send(admin)
      .then(res => {
        res.should.have.status(201);
        res.body.should.have.property("code");
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("A verification code has been sent to admin@mail.com");
        signupVerifyCodeAdmin = res.body.code;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should confirm admin user", function(done) {
    chai.request(server)
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCodeAdmin })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("The account has been verified, you can now log in");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should login admin user", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .send({
        "email": config.admin.email,
        "password": config.admin.password,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("id");
        res.body.should.have.property("email");
        res.body.should.have.property("roles");
        res.body.should.have.property("plan");
        res.body.should.have.property("accessToken");
        res.body.should.have.property("refreshToken");
        res.body.should.have.property("id");
        accessTokenAdmin = res.body.accessToken;
        refreshTokenAdmin = res.body.refreshToken;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

/*
  it("should not login removed user", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("X-Access-Token", accessTokenAdmin)
      .send({
        filter: {"email": config.user.email },
      })
      .then(res => {
        res.should.have.status(200);
        chai.request(server)
          .post("/api/auth/signin")
          .send({
            "email": config.user.email,
            "password": config.user.password,
          })
          .then(res => {
            res.should.have.status(400);
            done();
          })
          .catch((err) => {
            done(err);
          })
        ;
      })
      .catch((err) => {
        done(err);
      })
    ;
  });
*/
  
  it("should not refresh token without refresh token", function(done) {
    chai.request(server)
      .post("/api/auth/refreshtoken")
      .send({})
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please make a new signin request");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not refresh token with invalid refresh token", function(done) {
    chai.request(server)
      .post("/api/auth/refreshtoken")
      .send({ refreshToken: "invalid token"})
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please make a new signin request");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should refresh token", function(done) {
    chai.request(server)
      .post("/api/auth/refreshtoken")
      .send({token: refreshToken})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("accessToken");
        res.body.should.have.property("refreshToken");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

/*
  describe("should handle database errors", function() {
    it("signup should respond with a server error", function() {
      const stub = sinon.stub(User, "findOne").rejects(new Error("Simulated database error"));
      const spy = chai.spy();
      return chai
        .request(server)
        .post("/api/auth/signup")
        .send(config.user)
        .then(spy)
        .catch((err) => {
          const res = err.response;
          res.should.have.status(500);
          stub.restore();
        })
        .then(() => {
          spy.should.not.have.been.called();
        })
      ;
    });
  });
*/

});
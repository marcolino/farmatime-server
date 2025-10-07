const chai = require("chai");
const sinon = require("sinon");
const passport = require("passport");
const authController = require("../../src/controllers/auth.controller");
const expect = chai.expect;

describe("Auth google callback controller", () => {
  let req, res, next;
  let stubAuthenticate;
  let stubSocialLogin;

  beforeEach(() => {
    // setup mock objects
    req = {
      query: {},
      parameters: {},
      userSocial: null,
      t: sinon.spy(),
    };
    res = { redirect: sinon.stub() };
    next = sinon.spy();
    
    // stub socialLogin
    stubSocialLogin = sinon.stub().callsFake((req, res, next) => next());
    sinon.stub(require("../../src/controllers/auth.controller"), "socialLogin").callsFake(stubSocialLogin);

    // stub passport.authenticate to simulate behavior
    stubAuthenticate = sinon.stub(passport, "authenticate").callsFake((strategy, options, callback) => {
      return (req, res, next) => {
        // simulate an error being passed to the callback
        const testError = new Error("Auth failed");
        callback(testError, null);
      };
    });
  });

  afterEach(() => {
    sinon.restore();
  });


  it("should handle authentication errors", async () => {
    await authController.googleCallback(req, res, next);
   
    // assert res.redirect was called
    expect(res.redirect.calledOnce).to.be.true;

    // make sure we are checking a string
    const redirectUrl = String(res.redirect.firstCall.args[0]);
    expect(redirectUrl).to.include("social-signin-error");
  });

  // it("should parse rememberMe from state parameter", async () => {
  //   req.query.state = JSON.stringify({ rememberMe: true });
  //   await authController.googleCallback(req, res, next);
  //   expect(req.parameters.rememberMe).to.be.true;
  //   sinon.assert.calledWithMatch(stubAuthenticate, "google", {
  //     failureRedirect: "/"
  //   });
  // });
  /*
  it("should parse rememberMe from state parameter", async () => {
    // simulate a valid state parameter
    req.parameters.state = JSON.stringify({ rememberMe: true });

    // stub authenticate to succeed
    stubAuthenticate.callsFake((strategy, options, callback) => {
      return (req, res, next) => {
        const profile = {
          provider: "google",
          id: "123",
          emails: [{ value: "test@example.com", verified: true }],
          name: { givenName: "John", familyName: "Doe" },
          photos: [{ value: "photo.jpg" }]
        };
        callback(null, profile);
      };
    });

    await authController.googleCallback(req, res, next);

    expect(req.parameters.rememberMe).to.be.true;
    sinon.assert.calledWithMatch(stubAuthenticate, "google-web", {
      failureRedirect: "/"
    });
  });
  */

/*  it("should construct userSocial object from profile", async () => {

    const mockProfile = {
      provider: "google",
      id: "123",
      emails: [{ value: "test@example.com", verified: true }],
      name: {
        givenName: "John",
        familyName: "Doe"
      },
      photos: [{ value: "avatar.jpg" }]
    };
    // stub passport.authenticate to call the callback with the mock profile
    stubAuthenticate.callsFake((strategy, options, callback) => {
      return (req, res, next) => {
        // call the callback with no error and the mock profile
        callback(null, mockProfile);
      };
    });
    await authController.googleCallback(req, res, next);
    expect(req.userSocial).to.deep.equal({
      socialId: "google:123",
      provider: "google",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      photo: "avatar.jpg"
    });
  });
*/
/*
  it("should use first verified email", async () => {
    const mockProfile = {
      emails: [
        { value: "unverified@example.com", verified: false },
        { value: "verified@example.com", verified: true }
      ]
    };
    // stub passport.authenticate to call its callback with the mock profile
    stubAuthenticate.callsFake((strategy, options, callback) => {
      return (req, res, next) => {
        // call the callback with no error and the mock profile
        callback(null, mockProfile);
      };
    });
    await authController.googleCallback(req, res, next);
    // assert that req.userSocial.email is set to the first verified email
    expect(req.userSocial.email).to.equal("verified@example.com");
  });
*/
});

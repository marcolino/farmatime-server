const server = require("../server.test");
const jwt = require("jsonwebtoken");
const RefreshToken = require("../../src/models/refreshToken.model.js");
const config = require("../../src/config.js");

describe("RefreshToken model", () => {
  let jwtSignStub, refreshTokenSaveStub;

  beforeEach(() => {
    // mock jwt.sign
    jwtSignStub = server.sinon.stub(jwt, "sign").returns("mocked-refresh-token");

    // mock RefreshToken.prototype.save
    refreshTokenSaveStub = server.sinon.stub(RefreshToken.prototype, "save").resolves();
  });

  afterEach(() => {
    // restore all stubs
    server.sinon.restore();
  });

  it("should create and save a refresh token with rememberMe", async () => {
    const user = { id: "123", _id: "user123" };
    const rememberMe = true;

    const token = await RefreshToken.createToken(user, rememberMe);

    // verify jwt.sign was called with the correct arguments
    server.sinon.assert.calledWith(jwtSignStub,
      { id: user.id },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: config.app.auth.refreshTokenExpirationSeconds } // Correct expiresIn
    );

    // verify save was called
    server.sinon.assert.calledOnce(refreshTokenSaveStub);

    // verify the returned token
    server.expect(token).to.equal("mocked-refresh-token");
  });

  it("should create and save a refresh token without rememberMe", async () => {
    const user = { id: "123", _id: "user123" };
    const rememberMe = false;

    const token = await RefreshToken.createToken(user, rememberMe);

    // verify jwt.sign was called with the correct arguments
    server.sinon.assert.calledWith(jwtSignStub,
      { id: user.id },
      process.env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: config.app.auth.refreshTokenExpirationDontRememberMeSeconds }
    );

    // verify save was called
    server.sinon.assert.calledOnce(refreshTokenSaveStub);

    // verify the returned token
    server.expect(token).to.equal("mocked-refresh-token");
  });

  it("should handle duplicate key error", async () => {
    const user = { id: "123", _id: "user123" };
    const rememberMe = true;

    // mock save to throw a duplicate key error
    refreshTokenSaveStub.rejects({ code: 11000 });

    const token = await RefreshToken.createToken(user, rememberMe);

    // verify the function returns undefined for duplicate key error
    server.expect(token).to.be.undefined;
  });

  it("should throw an error for other save errors", async () => {
    const user = { id: "123", _id: "user123" };
    const rememberMe = true;

    // mock save to throw a generic error
    refreshTokenSaveStub.rejects(new Error("Database error"));

    try {
      await RefreshToken.createToken(user, rememberMe);
      server.expect.fail("Expected an error to be thrown");
    } catch (err) {
      // verify the error message
      server.expect(err.message).to.equal("Database error");
    }
  });
});
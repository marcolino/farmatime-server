const server = require("../server.test");
const jwt = require("jsonwebtoken");
const AccessToken = require("../../src/models/accessToken.model.js");
const config = require("../../src/config.js");


describe("AccessToken model", () => {
  let jwtSignStub, accessTokenSaveStub;

  beforeEach(() => {
    // mock jwt.sign
    jwtSignStub = server.sinon.stub(jwt, "sign").returns("mocked-access-token");

    // mock AccessToken.prototype.save
    accessTokenSaveStub = server.sinon.stub(AccessToken.prototype, "save").resolves();
  });

  afterEach(() => {
    // restore all stubs
    server.sinon.restore();
  });

  it("should create and save an access token", async () => {
    const user = { id: "123", _id: "user123" };

    const token = await AccessToken.createToken(user);

    // verify jwt.sign was called with the correct arguments
    server.sinon.assert.calledWith(jwtSignStub,
      { id: user.id },
      process.env.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: config.app.auth.accessTokenExpirationSeconds, // 1800
    });

    // verify save was called
    server.sinon.assert.calledOnce(accessTokenSaveStub);

    // verify the returned token
    server.expect(token).to.equal("mocked-access-token");
  });

  it("should handle duplicate key error", async () => {
    const user = { id: "123", _id: "user123" };

    // mock save to throw a duplicate key error
    accessTokenSaveStub.rejects({ code: 11000 });

    const token = await AccessToken.createToken(user);

    // verify the function returns a string token for duplicate key error
    server.expect(token).to.be.string;
  });

  it("should throw an error for other save errors", async () => {
    const user = { id: "123", _id: "user123" };

    // mock save to throw a generic error
    accessTokenSaveStub.rejects(new Error("Database error"));

    try {
      await AccessToken.createToken(user);
      server.expect.fail("server.expected an error to be thrown");
    } catch (err) {
      // verify the error message
      server.expect(err.message).to.equal("Database error");
    }
  });
});

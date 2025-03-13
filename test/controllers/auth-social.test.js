/**
 * Social Auth routes tests
 */

const server = require("../server.test");
const passport = require("passport");


describe("Auth google login routes", () => {
  let passportStub;

  afterEach(() => {
    // restore the stub after each test
    if (passportStub) passportStub.restore();
  });

  it("should authenticate with Google and return a user", async () => {
    // stub Passport's authenticate to simulate success
    passportStub = server.sinon.stub(passport, "authenticate").callsFake((strategy, options, callback) => {
      return (req, res, next) => {
        // mock user object
        const mockUser = { id: "123", email: "test@example.com", name: "Test User" };
        // simulate successful login
        req.login(mockUser, (err) => {
          if (err) return next(err);
          res.status(200).json({ user: mockUser });
        });
      };
    });

    // test the callback route
    const res = await server.request.get("/api/auth/google/callback");
    server.expect(res).to.have.property("status").equal(200);
    server.expect(res.body?.user).to.have.property("email", "test@example.com");
  });

  it("should handle Google OAuth failure", async () => {
    passportStub = server.sinon.stub(passport, "authenticate").returns((req, res, next) => {
      res.status(401).json({ error: "Google auth failed" });
    });

    const res = await server.request.get("/api/auth/google/callback");
    server.expect(res).to.have.property("status").equal(401);
    server.expect(res.body.error).to.equal("Google auth failed");
  });
});

describe("Auth facebook login routes", () => {
  let passportStub;

  afterEach(() => {
    if (passportStub) passportStub.restore();
  });

  it("should authenticate with Facebook and return a user", async () => {
    passportStub = server.sinon.stub(passport, "authenticate").returns((req, res, next) => {
      const mockUser = { id: "456", email: "test@fb.com", name: "FB User" };
      req.login(mockUser, (err) => {
        res.status(200).json({ user: mockUser });
      });
    });

    const res = await server.request.get("/api/auth/facebook/callback");
    server.expect(res).to.have.property("status").equal(200);
    server.expect(res.body.user.email).to.equal("test@fb.com");
  });

  it("should handle Facebook OAuth failure", async () => {
    passportStub = server.sinon.stub(passport, "authenticate").returns((req, res, next) => {
      res.status(401).json({ error: "Facebook auth failed" });
    });

    const res = await server.request.get("/api/auth/facebook/callback");
    server.expect(res).to.have.property("status").equal(401);
    server.expect(res.body.error).to.equal("Facebook auth failed");
  });
});

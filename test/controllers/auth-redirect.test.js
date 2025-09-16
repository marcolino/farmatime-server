const server = require("../server.test");
//const authController = require("../../src/controllers/auth.controller");
const { redirectToClientWithSuccess, redirectToClientWithError } = require("../../src/libs/misc");
const config = require("../../src/config");

describe("Auth redirect to client controllers", async () => {
  let req, res;

  beforeEach(function () {
    req = {};
    res = {
      redirect: server.sinon.stub(),
    };
  });

  it("should redirect to success URL with payload", async () => {
    const payload = { user: "testUser" };
    redirectToClientWithSuccess(req, res, payload);

    const expectedUrl = new URL(`${config.baseUrlClient}/social-signin-success`);
    expectedUrl.searchParams.set("data", JSON.stringify(payload));

    server.expect(res.redirect.calledOnce).to.be.true;
    server.expect(res.redirect.calledWith(expectedUrl/*.toString()*/)).to.be.true;
  });

  it("should redirect to error URL with payload", async () => {
    const payload = { error: "Invalid token" };
    redirectToClientWithError(req, res, payload);

    const expectedUrl = new URL(`${config.baseUrlClient}/social-signin-error`);
    expectedUrl.searchParams.set("data", JSON.stringify(payload));

    server.expect(res.redirect.calledOnce).to.be.true;
    server.expect(res.redirect.calledWith(expectedUrl/*.toString()*/)).to.be.true;
  });
});
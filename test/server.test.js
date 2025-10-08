require('dotenv').config({ path: __dirname + '/../.env', override: true }); // for *_OAUTH_CLIENT_* variables

const chai = require("chai");
const spies = require("chai-spies");
const sinon = require("sinon");
const server = require("../server");
const { initializeDatabase } = require("../src/models/db");
const { supertestWithLanguage } = require("./plugins/language");
const demoData = require("../data/demo.js");
const setup = require("./setup.test.js");

chai.use(spies); // with spies we test behavior, not implementation: Spies helps ensure that functions are called as expected without worrying about their implementation
chai.should();
const requestWithLanguage = supertestWithLanguage(setup.language)(server); // use supertest adding an Accept-Header language in setup.language
const agent = supertestWithLanguage(setup.language)(server);
const accessTokenCookies = [], refreshTokenCookies = [];

process.on("unhandledRejection", (reason, promise) => { // this should not happen!
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1); // terminate the process here
});


// before hook to log in the user and get the auth cookie
before(async () => {
  await resetDatabase();
});

const resetDatabase = async () => {
  await initializeDatabase(); // wait the database to be connected and populated
  await setupLoginCredentialsAll(); // wait all the roles credentials are set up
};

// setup all roles credentials
const setupLoginCredentialsAll = async () => {
  for (const role of demoData.roles) {
    await setupLoginCredentials(role.name);
  }
};

// setup variable role user credentials
const setupLoginCredentials = async (role) => {
  const response = await agent
    .post("/api/auth/signin")
    .send({
      email: demoData.users[role].email,
      password: demoData.users[role].password,
    })
  ;
  const expect = 200;
  if (response.status !== expect) {
    throw new Error(`Login failed with status ${response.status} (${response._body?.message})`);
  }
  // extract the httpOnly cookie from the response
  accessTokenCookies[role] = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("accessToken="));
  refreshTokenCookies[role] = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("refreshToken="));
  if (!accessTokenCookies[role]) {
    throw new Error(`Login failed: no accessToken ${role} cookie found`);
  }
  if (!refreshTokenCookies[role]) {
    throw new Error(`Login failed: no refreshToken ${role} cookie found`);
  }
};

const getAuthCookies = (role) => ([accessTokenCookies[role], refreshTokenCookies[role]]);

module.exports = {
  sinon,
  request: requestWithLanguage,
  expect: chai.expect,
  resetDatabase,
  setupLoginCredentials,
  getAuthCookies,
};

// require all tests here, to define the sequence
require("./basic/basic.test");

require("./config/config.test");

require("./routes/auth.test");
require("./routes/user.test");
require("./routes/product.test");
require("./routes/payment.test");
require("./routes/misc.test");

require("./libs/environment.test");

require("./models/plan.model.test");
require("./models/role.model.test");
require("./models/accessToken.model.test");
require("./models/refreshToken.model.test");
//require("./models/env.model.test"); // TODO (this tests must be implemented yet)
//require("./models/notificationToken.model.test"); // TODO (this tests must be implemented yet)
//require("./models/product.model.test"); // TODO (this tests must be implemented yet)
//require("./models/user.model.test"); // TODO (this tests must be implemented yet)
//require("./models/verificationCode.model.test"); // TODO (this tests must be implemented yet)

require("./controllers/auth.test");
require("./controllers/auth-social.test");
require("./controllers/auth-signupVerification.test");
require("./controllers/auth-resendSignupVerificationCode.test");
require("./controllers/auth-signup.test");

require("./controllers/auth-googleLogin.test");
//require("./controllers/auth-facebookLogin.test"); // TODO (Facebook oAuth2 provider is not enabled yet)
require("./controllers/auth-googleCallback.test");
//require("./controllers/auth-facebookCallback.test"); // TODO (Facebook oAuth2 provider is not enabled yet)
require("./controllers/auth-socialLogin.test"); // TODO...

require("./controllers/auth-socialRevoke.test");
require("./controllers/auth-resetPassword.test");
require("./controllers/auth-resendResetPasswordCode.test");
require("./controllers/auth-redirect.test");
require("./controllers/logger.test");
require("./controllers/misc.test");
require("./controllers/product.test");

require("./services/payment.test");

require("./gateways/Abstract.payment.gateway.test");
require("./gateways/stripe.payment.gateway.test");

require("./controllers/user.test");

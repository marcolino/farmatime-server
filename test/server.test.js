const chai = require("chai");
const spies = require("chai-spies");
const sinon = require("sinon");
const server = require("../server");
const db = require("../src/models/db");
const { supertestWithLanguage } = require("./plugins/language");
const demoData = require("../data/demo.js");
const config = require("./config.test");

chai.use(spies); // with spies we test behavior, not implementation: Spies helps ensure that functions are called as expected without worrying about their implementation
chai.should();
const requestWithLanguage = supertestWithLanguage(config.language)(server); // use supertest adding an Accept-HEader language in config.language

process.on("unhandledRejection", (reason, promise) => { // this should not happen!
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1); // terminate the process here
});

let expect;
let accessTokenCookieAdmin, refreshTokenCookieAdmin;
let accessTokenCookieUser, refreshTokenCookieUser;

/// before hook to log in the user and get the auth cookie
before(async () => {
  await db.initializeDatabase; // wait the database to be ready
  await setupLoginCredentials(); // wait to setup login credentials
});

const agent = supertestWithLanguage(config.language)(server);

const setupLoginCredentials = async () => {
  let response;
  
  // log in the admin user programmatically
  response = await agent
    .post("/api/auth/signin")
    .send({
      email: demoData.default.adminUser.email,
      password: demoData.default.adminUser.password,
    })
  ;
  expect = 200;
  if (response.status !== expect) {
    throw new Error(`Login failed with status ${response.status} (${response._body?.message})`);
  }
  // extract the httpOnly cookie from the response
  accessTokenCookieAdmin = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("accessToken="));
  refreshTokenCookieAdmin = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("refreshToken="));
  if (!accessTokenCookieAdmin) {
    throw new Error("Login failed: no accessToken admin cookie found");
  }
  if (!refreshTokenCookieAdmin) {
    throw new Error("Login failed: no refreshToken admin cookie found");
  }

  // log in the standard user programmatically
  response = await agent
    .post("/api/auth/signin")
    .send({
      email: demoData.default.userUser.email,
      password: demoData.default.userUser.password,
    })
  ;
  expect = 200;
  if (response.status !== expect) {
    throw new Error(`Login failed with status ${response.status} (${response._body?.message})`);
  }
  // extract the httpOnly cookie from the response
  accessTokenCookieUser = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("accessToken="));
  refreshTokenCookieUser = response.headers["set-cookie"]
    .find((cookie) => cookie.startsWith("refreshToken="));
  if (!accessTokenCookieUser) {
    throw new Error("Login failed: no accessToken user cookie found");
  }
  if (!refreshTokenCookieUser) {
    throw new Error("Login failed: no refreshToken user cookie found");
  }
};

module.exports = {
  //chai,
  sinon,
  request: requestWithLanguage,
  expect: chai.expect,
  db,
  // User,
  // Role,
  // config,
  setupLoginCredentials,
  getAuthCookiesAdmin: () => ([ accessTokenCookieAdmin, refreshTokenCookieAdmin ]),
  // getAuthCookiesOperator: () => ([ accessTokenCookieOperator, refreshTokenCookieOperator ]),
  // getAuthCookiesDealer: () => ([ accessTokenCookieDealer, refreshTokenCookieDealer ]),
  getAuthCookiesUser: () => ([ accessTokenCookieUser, refreshTokenCookieUser ]),
};

// require all tests here, to choose the sequence

require("./basic/basic.test");
require("./helpers/environment.test");
require("./controllers/auth.test");
require("./controllers/auth-social.test");
require("./controllers/user.test");
//require("./controllers/payment.test");
require("./controllers/product.test");

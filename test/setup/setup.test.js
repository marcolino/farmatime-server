const request = require("supertest");
//const mongoose = require("mongoose");
const app = require("../../server");
const db = require("../../src/models");
//const User = require("../../src/models/user.model");
const emailService = require("../../src/services/email.service");
//const config = require("../config.test");
const configGlobal = require("../../src/config");

const agent = request(app);

let expect;
let accessTokenCookieAdmin, refreshTokenCookieAdmin;
let accessTokenCookieUser, refreshTokenCookieUser;

// before hook to log in the user and get the auth cookie
before(async () => {
  await db.dbReady; // wait for the database to be ready
  await setupLoginCredentials(); // wait to setup login credentials
  try {
    console.log("TEST Initializing email service...");
    await emailService.setup(process.env.BREVO_EMAIL_API_KEY); // await the email service to be ready
    console.log("TEST Email service initialized successfully");
  } catch (err) {
    console.error("TEST Failed to initialize email service:", err);
    process.exit(1);
  }
});

// conntect to db, populate it, and setup login credentials
const setupLoginCredentials = async () => {
  let response;
  
  // log in the admin user programmatically
  response = await agent
    .post("/api/auth/signin")
    .send({
      email: configGlobal.defaultUsers.admin.email,
      password: configGlobal.defaultUsers.admin.password,
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
      email: configGlobal.defaultUsers.user.email,
      password: configGlobal.defaultUsers.user.password,
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

/*
beforeEach(async () => {
  // drop all dynamic collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  collections
    .map((collection) => collection.name)
    .forEach(async (collectionName) => {
      //console.log("collectionName:", collectionName);
      if ( // skip "static" collections
        (collectionName !== "envs") &&
        (collectionName !== "roles") &&
        (collectionName !== "plans")
      ) {
        mongoose.connection.db.dropCollection(collectionName);
      }
    })
  ;
});
*/

module.exports = {
  setupLoginCredentials,
  getAuthCookiesAdmin: () => ([ accessTokenCookieAdmin, refreshTokenCookieAdmin ]),
  getAuthCookiesUser: () => ([ accessTokenCookieUser, refreshTokenCookieUser ]),
};

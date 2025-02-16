const chai = require("chai");
const spies = require("chai-spies");
const sinon = require("sinon");
const server = require("../server");
const db = require("../src/models");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const { supertestWithLanguage } = require("./plugins/language");
const config = require("./config.test");

chai.use(spies);
chai.should();
const requestWithLanguage = supertestWithLanguage(config.language)(server); // use supertest adding an Accept-HEader language in config.language

console.log("Server unit tests");

process.on("unhandledRejection", (reason, promise) => { // this should not happen!
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1); // terminate the process here
});

module.exports = {
  chai,
  sinon,
  request: requestWithLanguage,
  expect: chai.expect,
  db,
  User,
  Role,
  config,
};

// require all tests here, to choose the sequence

require("./basic/basic.test");
require("./helpers/environment.test");
require("./controllers/auth.test");
require("./controllers/auth-social.test");
require("./controllers/user.test");
require("./controllers/payment.test");
require("./controllers/product.test");

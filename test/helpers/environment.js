/**
 * Helpers environment tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
const should = chai.should();
const expect = chai.expect;
const server = require("../../server");
const environment = require("../../src/helpers/environment");
const { config } = require("../config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests

describe("API tests - Helpers - Environment", async function() {

  before(async() => { // before these tests we empty the database
  });

  it("should not assert environment with no environment", function(done) {
    const envBackup = process.env;
    process.env = null;
    const res = environment.assertEnvironment();
    expect(res).to.be.false;
    process.env = envBackup;
    done();
  });
  it("should not assert environment with missing required variable", function(done) {
    const envBackup = process.env;
    process.env = [];
    const res = environment.assertEnvironment();
    expect(res).to.be.false;
    process.env = envBackup;
    done();
  });
  it("should assert environment with default environment", function(done) {
    const res = environment.assertEnvironment();
    expect(res).to.be.true;
    done();
  });

});
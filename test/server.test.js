/**
 * Server tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
const should = chai.should();
const expect = chai.expect;
const server = require("../server");
const db = require("../src/models");
const User = require("../src/models/user.model");
const Role = require("../src/models/role.model");
const Plan = require("../src/models/plan.model");
const { config } = require("./config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests

let accessTokenUser, accessTokenAdmin;

describe("API tests - Server", async function() {

  it("should correctly handle not found route", function(done) {
    chai.request(server)
      .post("/api/not-found-route")
      .then(res => {
        res.should.have.status(404);
        res.body.should.have.property("error");
        expect(res.body.error).to.equal("Not found");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

});

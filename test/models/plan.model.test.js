/**
 * User model tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
const should = chai.should();
const expect = chai.expect;
const server = require("../../server");
const User = require("../../src/models/user.model");
const Plan = require("../../src/models/plan.model");
const { config } = require("../config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests

let accessTokenUser, accessTokenAdmin;

describe("API tests - Plan model", async function() {

  before(async() => { // before these tests we empty the database
  });

  it("plan model should accept any value different by -1 (\"unlimited\")", function(done) {
    Plan.findOne({}, (err, plan) => {
      if (err) {
        return done(err);
      }
      should.exist(plan);
      //const number = 123;
      //plan.cigNumberAllowed = number;
      plan.save((err, plan) => {
        should.not.exist(err);
        should.exist(plan);
        //expect(plan.cigNumberAllowed).to.equal(number);
        done();
      });
    });
  });

  it("plan model should convert -1 (\"unlimited\") value to a number (MAX_SAFE_INTEGER)", function(done) {
    Plan.findOne({}, (err, plan) => {
      if (err) {
        return done(err);
      }
      should.exist(plan);
      //plan.cigNumberAllowed = -1;
      plan.save((err, plan) => {
        should.not.exist(err);
        should.exist(plan);
        //expect(plan.cigNumberAllowed).to.equal(Number.MAX_SAFE_INTEGER);
        done();
      })
    });
  });
});

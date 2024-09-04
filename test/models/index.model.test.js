/**
 * Index of model tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
//const should = chai.should();
const expect = chai.expect;
//const server = require("../../server");
const db = require("../../src/models");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const Plan = require("../../src/models/plan.model");
const { chaiHttpWithLanguage } = require("../plugins/language");
const { config } = require("../config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests
chai.use(chaiHttpWithLanguage(config.language));

chai.config.includeStack = true; // to include stack in errors

describe("API tests - Index of models", async function() {
  
  before(async () => { // before these tests we empty the database
    
    await db.connect();

    // clearing user collection from test database
    User.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
    // clearing role collection from test database
    Role.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
    // clearing plan collection from test database
    Plan.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  it("should populate database if empty", function() {
    return db.populate()
      .then(() => {
        return User.estimatedDocumentCount().exec();
      })
      .then(count => {
        expect(count).to.be.above(0); // expect that users are added
      })
    ;
  });

});

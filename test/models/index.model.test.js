/**
 * Global model tests
 */
const server = require("../server.test");
const db = require("../../src/models");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const Plan = require("../../src/models/plan.model");
//const config = require("../config.test");

describe("Global models", async function() {
  
  // before(async () => { // before these tests we empty the database
    
  //   await db.connect();

  //   // clearing user collection from test database
  //   try {
  //     await User.deleteMany();
  //   } catch (err) {
  //     console.error(err);
  //   }

  //   // clearing role collection from test database
  //   try {
  //     await Role.deleteMany();
  //   } catch (err) {
  //     console.error(err);
  //   }

  //   // clearing plan collection from test database
  //   try {
  //     await Plan.deleteMany();
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

  // it("should populate database if empty", async () => {
  //   try {
  //     const count = await db.populate();
  //     console.log("CCC", count);
  //     server.expect(count).to.be.above(0); // expect that users are added
  //   } catch (err) {
  //     console.error(`Error: ${err}`);
  //     throw new Error();
  //   }
  // });

});

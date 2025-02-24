/**
 * Plan model tests
 */
const server = require("../server.test");
const Plan = require("../../src/models/plan.model");
//const config = require("../config.test");

describe("Plan model", async function() {

  it("plan model should accept any value different by -1 (\"unlimited\")", async () => {
    try {
      const plan = await Plan.findOne();
      server.expect(plan).to.exist;
      //const number = 123;
      //plan.cigNumberAllowed = number;
      const planNew = await plan.save();
      server.should.exist(planNew);
    } catch (err) {
      console.error(`Error: ${err}`);
      throw new Error();
    }

  });

  it("plan model should convert -1 (\"unlimited\") value to a number (MAX_SAFE_INTEGER)", async () => {
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
      });
    });
  });
});

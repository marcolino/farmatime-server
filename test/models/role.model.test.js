/**
 * Plan model tests
 */
const server = require("../server.test");
const Role = require("../../src/models/role.model");
//const config = require("../config.test");

describe("Role model", async () => {

  it("role model should accept valid roles", async () => {
    try {
      const role = await Role.findOne();
      console.log("role:", role);
      server.expect(role).to.exist;
      const roleNew = await role.save();
      server.expect(roleNew).to.exist;
    } catch (err) {
      console.error(`Error: ${err}`);
      throw new Error();
    }

  });

});

/**
 * Role model tests
 */
const server = require("../server.test");
const Role = require("../../src/models/role.model");

describe("Role model", () => {
  let roleFindOneStub, roleSaveStub;

  beforeEach(() => {
    // create a mock Role instance
    const mockRole = new Role({
      name: "admin",
      description: "Administrator role",
    });

    // mock Role.findOne to return the mock Role instance
    roleFindOneStub = server.sinon.stub(Role, "findOne").resolves(mockRole);

    // mock Role.prototype.save to resolve successfully
    roleSaveStub = server.sinon.stub(Role.prototype, "save").resolves(mockRole);
  });

  afterEach(() => {
    // restore all stubs
    server.sinon.restore();
  });

  it("should find and save a valid role", async () => {
    try {
      // find a role
      const role = await Role.findOne();

      // verify that Role.findOne was called
      server.sinon.assert.calledOnce(roleFindOneStub);

      // verify that the role exists
      server.expect(role).to.exist;

      // save the role
      const roleNew = await role.save();

      // verify that role.save was called
      server.sinon.assert.calledOnce(roleSaveStub);

      // verify that the saved role exists
      server.expect(roleNew).to.exist;
    } catch (err) {
      console.error(`Error: ${err}`);
      throw new Error();
    }
  });
});

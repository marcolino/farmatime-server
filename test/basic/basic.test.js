const server = require("../server.test");
//const { getAuthCookiesAdmin } = require("../setup/setup.test");
const db = require("../../src/models");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const config = require("../config.test");


describe("Basic tests", () => {
  it("should access the root route", async () => {
   const res = await server.request
     .get("/")
     .expect(200)
    ;
    //assert.equal(response.status, 200);
  });
  it("should not find a non-existing route", async () => {
    const res = await server.request
      .get("/api/non-existing")
      .expect(404)
    ;
    //assert.equal(response.status, 404);
  });

});
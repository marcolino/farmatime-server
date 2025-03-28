const server = require("../server.test");
//const { request } = require("../server.test");


describe("Basic tests", () => {
  it("should access the root route", async () => {
   const res = await server.request
     .get("/")
     .expect(200)
    ;
  });
  it("should not find a non-existing route", async () => {
    const res = await server.request
      .get("/api/non-existing")
      .expect(404)
    ;
  });

});
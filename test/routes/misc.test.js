/**
 * User routes tests
 */

const server = require("../server.test");

let expect;


describe("Misc routes", () => {
  
  it("should ping", async () => {
    const res = await server.request
      .get("/api/misc/ping")
      //.set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });
  it("should send test email (if not production)", async () => {
    const res = await server.request
      .get("/api/misc/sendTestEmail")
      //.set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });
});

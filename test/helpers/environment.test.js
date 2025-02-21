/**
 * Environment tests
 */
const server = require("../server.test");
//const config = require("../config.test");

const { assertEnvironment } = require("../../src/helpers/environment");

describe("Helpers - Environment", async () => {
  it("should not assert environment with no environment", async () => {
    const envBackup = process.env;
    process.env = undefined; // simulate no environment
    const res = assertEnvironment();
    server.expect(res).to.equal(false);
    process.env = envBackup; // restore the original environment
  });

  it("should not assert environment with missing required variable", async () => {
    const envBackup = process.env;
    process.env = []; // simulate empty environment
    const res = assertEnvironment();
    server.expect(res).to.equal(false);
    process.env = envBackup;
  });
  it("should assert environment with default environment", async () => {
    const res = assertEnvironment();
    server.expect(res).to.equal(true);
  });

});
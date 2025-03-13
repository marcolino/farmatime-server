/**
 * Environment tests
 */
const server = require("../server.test");

const { assertEnvironment } = require("../../src/helpers/environment");

describe("Helpers - Environment", async () => {
  it("should not assert environment with no environment", async () => {
    const envBackup = process.env;
    process.env = {}; // simulate no environment
    server.expect(() => assertEnvironment()).to.throw(/Assertion failure: Missing in env: \[.*\]/);
    process.env = envBackup; // restore the original environment
  });

  it("should not assert environment with missing required variable", async () => {
    const envBackup = process.env;
    process.env = []; // simulate empty environment
    server.expect(() => assertEnvironment()).to.throw(/Assertion failure: Missing in env: \[.*\]/);
    process.env = envBackup;
  });
  it("should assert environment with default environment", async () => {
    server.expect(() => assertEnvironment()).not.to.throw(Error);
  });

});
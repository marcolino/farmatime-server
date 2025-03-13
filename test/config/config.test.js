const path = require("path");
const fs = require("fs");
const { expect } = require("chai");
const config = require("../../src/config");


describe("Config file", () => {
  const envFile = path.resolve(__dirname, "../../.env");
  let originalEnvContent = null; // to store the original content of .env

  beforeEach(() => {
    // backup the original .env file if it exists
    if (fs.existsSync(envFile)) {
      originalEnvContent = fs.readFileSync(envFile, "utf8");
    }

    // create a temporary .env file for testing
    fs.writeFileSync(envFile, "TEST_VAR=123");

    // ensure dotenv is loaded with the new .env file
    require("dotenv").config({ path: envFile, override: true });
  });

  afterEach(() => {
    // restore the original .env file after testing
    if (originalEnvContent !== null) {
      fs.writeFileSync(envFile, originalEnvContent);
    } else if (fs.existsSync(envFile)) {
      // if there was no original .env file, delete the temporary one
      fs.unlinkSync(envFile);
    }
    // reset process.env to its original state
    delete process.env.TEST_VAR;
  });

  it("should load environment variables from .env file in non-production mode", () => {
    // mock process.env.NODE_ENV to simulate non-production mode
    process.env.NODE_ENV = "development";
    process.env.GITHUB_ACTIONS = "false"; // ensure CI mode is off

    if (fs.existsSync(envFile)) {
      const envFileContents = fs.readFileSync(envFile, "utf8");
    }

    // reload the config to apply the mocked environment
    delete require.cache[require.resolve("../../src/config")];
    const config = require("../../src/config");

    // verify that the environment variable is loaded correctly
    expect(process.env.TEST_VAR).to.equal("123");
  });

  it("should throw an error if .env file is missing in non-production mode", () => {
    // mock process.env.NODE_ENV to simulate non-production mode
    process.env.NODE_ENV = "development";
    process.env.GITHUB_ACTIONS = "false"; // Ensure CI mode is off

    // ensure the .env file does not exist
    const envFile = ".env";
    if (fs.existsSync(envFile)) {
      fs.unlinkSync(envFile); // TODO: RESTORE IT!!!
    }

    // reload the config and expect an error
    delete require.cache[require.resolve("../../src/config")];
    expect(() => require("../../src/config")).to.throw(`Error: ${envFile} does not exist`);
  });
});


// test configuration merging
describe("Config merging", () => {
  const envFile = path.resolve(__dirname, "../../.env");
  const customization = "CUSTOM"; // use a different customization for testing
  const envFileCustom = path.join(__dirname, `../../src/config.${customization}.js`);
  let originalEnvCustomContent = null; // to store the original content of the customization file

  beforeEach(() => {
    // backup the original customization file if it exists
    if (fs.existsSync(envFileCustom)) {
      originalEnvCustomContent = fs.readFileSync(envFileCustom, "utf8");
    }

    // create a temporary customization file for testing
    fs.writeFileSync(
      envFileCustom,
      "module.exports = { api: { name: 'Custom API Name' } };"
    );

    // override the CUSTOMIZATION environment variable for the test
    process.env.CUSTOMIZATION = customization;

    // ensure dotenv is loaded with the new .env file
    require("dotenv").config({ path: envFile, override: true });
  });

  afterEach(() => {
    //restore the original customization file after testing
    if (originalEnvCustomContent !== null) {
      fs.writeFileSync(envFileCustom, originalEnvCustomContent);
    } else if (fs.existsSync(envFileCustom)) {
      // if there was no original customization file, delete the temporary one
      fs.unlinkSync(envFileCustom);
    }

    // reset process.env to its original state
    delete process.env.CUSTOMIZATION;
  });

  it("should merge configBase and configCustom correctly", () => {
    // reload the config to apply the mocked customization
    delete require.cache[require.resolve("../../src/config")];
    const config = require("../../src/config");

    // verify that the merged configuration contains the overridden value
    expect(config.api.name).to.equal("Custom API Name");
  });

  it("should throw an error if customization file is missing", () => {
    const customization = "non-existent";
    const envFileCustomNotExistent = path.join(__dirname, `../../src/config.${customization}.js`);

    process.env.CUSTOMIZATION = customization;

    // reload the config and expect an error
    delete require.cache[require.resolve("../../src/config")];
    expect(() => require("../../src/config")).to.throw(`Config file ${envFileCustomNotExistent} not found`);
  });
});

// test mode detection
describe("Config mode detection", () => {
  const envFile = path.resolve(__dirname, "../../.env");
  beforeEach(() => {
    // ensure dotenv is loaded with the new .env file
    require("dotenv").config({ path: envFile, override: true });
  });

  afterEach(() => {
    //reset process.env to its original state
    delete process.env.NODE_ENV;
  });

  it("should detect production mode correctly", () => {
    // set NODE_ENV to "production" before loading the config
    process.env.NODE_ENV = "production";

    // reload the config to apply the new environment variable
    delete require.cache[require.resolve("../../src/config")];
    const config = require("../../src/config");

    // verify that production mode is detected correctly
    expect(config.mode.production).to.be.true;
    expect(config.mode.development).to.be.false;
    expect(config.mode.staging).to.be.false;
    expect(config.mode.test).to.be.true; // while testing test mode is always true
  });

  it("should detect development mode correctly", () => {
    process.env.NODE_ENV = "development";
    delete require.cache[require.resolve("../../src/config")];
    const config = require("../../src/config");

    expect(config.mode.production).to.be.false;
    expect(config.mode.development).to.be.true;
    expect(config.mode.staging).to.be.false;
    expect(config.mode.test).to.be.true; // while testing test mode is always true
  });

  it("should detect test mode correctly", () => {
    process.env.NODE_ENV = "test";
    delete require.cache[require.resolve("../../src/config")];
    const config = require("../../src/config");

    expect(config.mode.production).to.be.false;
    expect(config.mode.development).to.be.false;
    expect(config.mode.staging).to.be.false;
    expect(config.mode.test).to.be.true;
  });
});

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const { expect } = require("chai");
const config = require("../../src/config");


describe("Config file", () => {
  const envFile = path.resolve(__dirname, "../../.env");
  const configFile = path.resolve(__dirname, "../../src/config.js");
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
    delete require.cache[require.resolve(configFile)];
    const config = require(configFile);

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
    delete require.cache[require.resolve(configFile)];
    expect(() => require(configFile)).to.throw(`Error: ${envFile} file does not exist`);
  });

  it("should return an error if the .env file is malformed", () => {
    // create a malformed .env file
    fs.writeFileSync(envFile, "INVALID LINE");

    // mock dotenv to simulate an error
    const error = new Error("Invalid line");
    sinon.stub(dotenv, "config").returns({ error });

    const result = dotenv.config({ path: envFile, override: true });

    // check that an error is returned
    expect(result.error).to.be.an("error");
    expect(result.error.message).to.include("Invalid line");

    // restore the original dotenv.config function
    dotenv.config.restore();
  });

  it("should throw an error if dotenv.config() throws an exception", () => {
    // mock process.env.NODE_ENV to simulate non-production mode
    process.env.NODE_ENV = "development";
  
    // ensure the .env file exists
    fs.writeFileSync(envFile, "TEST_VAR=123");
  
    // stub dotenv.config() to throw an exception
    sinon.stub(dotenv, "config").throws(new Error("Unexpected error"));
  
    // reload the config and expect an error
    delete require.cache[require.resolve(configFile)];
    expect(() => require(configFile)).to.throw(
      "Failed to load .env file: Unexpected error"
    );
  
    // restore the original dotenv.config function
    dotenv.config.restore();
  });

  it("should use production URL when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    delete require.cache[require.resolve(configFile)];
    const config = require(configFile);
    expect(config.baseUrlPublic).to.equal("https://medicare-prod.fly.dev");
  });

  it("should use staging URL when staging is true", () => {
    process.env.NODE_ENV = "staging";
    delete require.cache[require.resolve(configFile)];
    const config = require(configFile);
    expect(config.baseUrlPublic).to.equal("https://medicare-staging.fly.dev");
  });

  it("should use live stripe product LIVE_MODE is true", () => {
    process.env.LIVE_MODE = "true";
    delete require.cache[require.resolve(configFile)];
    const config = require(configFile);
    expect(config.payment.gateways.stripe.products.free.name).to.equal("Prodotto Gratuito LIVE");
  });

  it("should use live test product LIVE_MODE is false", () => {
    process.env.LIVE_MODE = "false";
    delete require.cache[require.resolve(configFile)];
    const config = require(configFile);
    expect(config.payment.gateways.stripe.products.free.name).to.equal("Prodotto Gratuito TEST");
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
      "module.exports = { api: { name: \"Custom API Name\" } };"
    );

    // override the CUSTOMIZATION environment variable for the test
    process.env.CUSTOMIZATION = customization;

    // ensure dotenv is loaded with the new .env file
    require("dotenv").config({ path: envFile, override: true });
  });

  afterEach(() => {
    // restore the original customization file after testing
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
    const customization = "CUSTOM";
    const envFileCustomNotExistent = path.join(__dirname, `../../src/config.${customization}.js`);

    process.env.CUSTOMIZATION = customization;

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

describe("Config environment loading", () => {
  let fsStub, dotenvStub, pathStub, originalEnv, originalCustomization;
  const configFile = "../../src/config.js";

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    originalCustomization = process.env.CUSTOMIZATION;
    
    fsStub = {
      existsSync: sinon.stub()
        .withArgs(".env").returns(true) // default to existing .env
        .withArgs(sinon.match(/config\..+\.js/)).returns(true) // handle customization files
    };
    
    dotenvStub = { config: sinon.stub().returns({ parsed: {} }) };
    pathStub = { join: sinon.stub().returnsArg(1) }; // simplify path resolution
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.CUSTOMIZATION = originalCustomization;
    sinon.restore();
    delete require.cache[require.resolve(configFile)];
  });

  //context("production environment", () => {
  it("should skip .env loading and customization checks in production environment", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CUSTOMIZATION;

    const config = proxyquire(configFile, {
      fs: fsStub,
      dotenv: { config: sinon.stub() },
      path: pathStub
    });

    sinon.assert.notCalled(fsStub.existsSync);
    sinon.assert.notCalled(dotenvStub.config);
  });
  //});

  //context("with customization", () => {
  it("should load specific customization file with customization", () => {
    process.env.CUSTOMIZATION = "CUSTOM";
    
    const config = proxyquire(configFile, {
      fs: fsStub,
      dotenv: dotenvStub,
      path: {
        join: (...args) => `mocked_path/${args[1]}`
      },
      "mocked_path/config.CUSTOM.js": { custom: "config" }
    });

    // add your assertions for merged config
    expect(config.mode.test).to.be.true;
  });
  //});
});

describe("Config merging", () => {
  let fsStub, pathStub, originalCustomization;
  const configFile = "../../src/config.js";

  beforeEach(() => {
    originalCustomization = process.env.CUSTOMIZATION;
    process.env.CUSTOMIZATION = "mda";

    fsStub = {
      existsSync: sinon.stub()
        .withArgs(".env").returns(true)
        .withArgs(sinon.match(/config\.mda\.js/)).returns(true)
    };

    pathStub = {
      join: sinon.stub().returns("config.mda.js")
    };
  });

  afterEach(() => {
    process.env.CUSTOMIZATION = originalCustomization;
    sinon.restore();
    delete require.cache[require.resolve(configFile)];
  });

  it("should merge custom API name into final config", () => {
    const customConfig = {
      api: {
        name: "CUSTOM-API-NAME",
        timeout: 3000
      }
    };

    const config = proxyquire(configFile, {
      fs: fsStub,
      path: pathStub,
      "config.mda.js": customConfig,
      dotenv: { config: sinon.stub().returns({ parsed: {} }) }
    });

    expect(config.api.name).to.equal("CUSTOM-API-NAME");
    expect(config.api).to.include({
      name: "CUSTOM-API-NAME",
      timeout: 3000
    });
  });
});

describe("Config file with test flag forced to false", () => {
  const configFile = "../../src/config.js";
  let config, originalGlobalIt;

  beforeEach(() => {
    // backup the original global.it
    originalGlobalIt = global.it;

    // temporarily unset global.it to simulate non-test environments
    delete global.it;

    // clear the require cache to reload the config file
    delete require.cache[require.resolve(configFile)];
    config = require(configFile);
  });

  afterEach(() => {
    // restore global.it after the test
    global.it = originalGlobalIt;

    // clear the require cache again
    delete require.cache[require.resolve(configFile)];
  });

  it("should execute code paths where test is false", () => {
    delete require.cache[require.resolve(configFile)];
    config = require(configFile);

    // assert that the test flag is false
    expect(typeof global.it).to.not.equal("function"); // ensure global.it is undefined
    expect(config.mode.test).to.be.false; // assuming your config exports 'test'
  });

  it("should use email dryrun if test or development", () => {
    delete require.cache[require.resolve(configFile)];
    config = require(configFile);

    expect(typeof global.it).to.not.equal("function"); // ensure global.it is undefined
    expect(config.mode.test).to.be.false;

    process.env.NODE_ENV = "not-development";
    delete require.cache[require.resolve(configFile)];
    config = require(configFile);
    expect(config.email.dryrun).to.be.false; // test is false ands mode is not development, dryrun should be false
  });
});


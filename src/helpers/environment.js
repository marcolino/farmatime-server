const { logger } = require("../controllers/logger.controller");
const config = require("../config");
const { audit } = require("../helpers/messaging");


const assertEnvironment = () => {
  try {
    if (!process.env) {
      throw ("Missing env!");
    }
    
    // find missing variables in current environment
    const missing = config.envRequiredVariables.filter(v => {
      return !(v in process.env); // this variable doesn't exist in process.env
    });
    if (missing.length) {
      throw(`Missing in env: ${JSON.stringify(missing)}`);
    }

    // some logical assertions
    if (process.env.LIVE_MODE === "true" && !config.mode.production) {
      throw("Assertion conflict: live mode is on and prodution mode is false!")
    }

    // TODO: more logical assertions...
  } catch (err) {
    const error = `Assertion failure: ${err}`;
    assertionsCheckFailure(error);
    throw error;
  }
};

const assertionsCheckFailure = async (htmlContent) => {
  // notify administration about assertion failures
  return audit({req: null, mode: "error", subject: "Assertion check failed", htmlContent});
};

module.exports = {
  assertEnvironment,
};

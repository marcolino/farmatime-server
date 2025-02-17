const { logger } = require("../controllers/logger.controller");
const config = require("../config");
const { audit } = require("../helpers/messaging");


const assertEnvironment = () => {
  if (!process.env) {
    let err = "Missing env!";
    logger.error(err);
    assertionsCheckFailure(err);
    return false;
  }
  // find missing variables in current environment
  const missing = config.envRequiredVariables.filter(v => {
    return !(v in process.env); // this variable doesn't exist in process.env
  });
  if (missing.length) {
    let err = `Missing in env: ${JSON.stringify(missing)}`;
    logger.error(err);

    assertionsCheckFailure(err);
    return false;
  }
  return true;
};

const assertionsCheckFailure = async (htmlContent) => {
  // notify administration about assertion failures
  return audit({req: null, mode: "error", subject: "Assertion check failed", htmlContent});
};

module.exports = {
  assertEnvironment,
};

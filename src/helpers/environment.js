const { logger } = require("../controllers/logger.controller");
const config = require("../config");
const { assertionsCheckFailure } = require("../helpers/notification");

const assertEnvironment = () => {
  if (!process.env) {
    logger.error("Missing env!");
    assertionsCheckFailure(`Missing env!`);
    return false;
  }
  // find missing variables in current environment
  const missing = config.envRequiredVariables.filter(v => {
    return !(v in process.env); // this variable doesn't exist in process.env
  });
  if (missing.length) {
    logger.error("Missing in env:", missing);
    assertionsCheckFailure(`Missing in env: ${JSON.stringify(missing)}`);
    return false;
  }

  return true;
};

module.exports = {
  assertEnvironment,
};

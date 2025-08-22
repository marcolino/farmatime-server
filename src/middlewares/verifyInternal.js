const { nextError } = require("../helpers/misc");
const config = require("../config");

const checkWorkerKey = async (req, res, next) => {
  if (!(config.mode.production || config.mode.staging)) { // enforce a worker key only in production or staging
    return next();
  }
  const workerKey = req.headers['x-worker-key'];
  if (!workerKey || workerKey !==  process.env.WORKER_KEY) {
    return nextError(next, req.t("Forbidden"), 401);
  }
  return next();
};

module.exports = {
  checkWorkerKey,
};

//const { nextError } = require("../libs/misc");
//const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const checkWorkerKey = async (req, res, next) => {
  if (!(config.mode.production || config.mode.staging)) { // enforce a worker key only in production or staging
    return next(); // pass
  }
  const workerKey = req.headers['x-worker-key'];
  if (!workerKey || workerKey !== process.env.WORKER_KEY) { // reject
    return res.status(403).json({ message: "Worker request rejected, invalid worker key" });
  }
  return next(); // pass
};

const checkBrevoWebhook = async (req, res, next) => {
  /**
   * Force unrecoverable errors to send a success status too,
   * to stop being flooded by the provider with webhhoks calls
   */
  const unrecoverableErrorStatus = 200;

  const payload = req.body;
  //logger.warn("checkBrevoWebhook request query secret:", secret);
  //logger.warn("checkBrevoWebhook request body payload:", payload);

  if (!payload.tags || !payload.tags.includes(config.email.trackTag)) { // reject, we don't want to track these emails
    return res.status(unrecoverableErrorStatus).json({ message: "Webhook rejected, no track tag" });
  }
  if (!payload.tags || !payload.tags.includes(process.env.BREVO_WEBHOOK_SECRET)) { // reject
    return res.status(unrecoverableErrorStatus).json({ message: "Webhook rejected, invalid secret" });
  }
  
  return next(); // pass
};

module.exports = {
  checkWorkerKey,
  checkBrevoWebhook,
};

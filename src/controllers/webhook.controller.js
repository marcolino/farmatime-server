const Request = require("../models/request.model");
const WebhookUUID = require("../models/WebhookUUID.model"); 
const { logger } = require("../controllers/logger.controller");
//const emailService = require("../services/email.service");
const { nextError } = require("../libs/misc");
//const config = require("../config");


const brevo = async (req, res, next) => {
  const payload = req.body;

  logger.info("Brevo webhook payload:", payload);

  const successStatus = 200;
  /**
   * Force unrecoverable errors to send a success status too,
   * to stop being flooded by the provider with webhhoks calls
   */
  const unrecoverableErrorStatus = 200;

  // Brevo webhook includes `messageId`
  const provider = "Brevo";
  const providerMessageId = payload['message-id'];
  const event = payload.event; // e.g. "delivered", "open", "click", "hardBounce"
  const uuid = payload.uuid; // Universally unique identifier

  /**
   * Check if uuid is new (otherwise ignore this request)
   */
  try {
    const oldWebhook = await WebhookUUID.findOne({ uuid });
    //if (await WebhookUUID.exists({ uuid })) {
    if (oldWebhook) {
      if (oldWebhook.events && oldWebhook.events.some(ev => ev.status === event)) {
        return nextError(next, `UUID ${uuid} is already seen, same event ${event}, ignoring`, unrecoverableErrorStatus);
      }
      logger.info(`UUID ${uuid} is already seen, changed event, proceeding`);
    } else {
      logger.info(`UUID ${uuid} is new, proceeding`);
      await WebhookUUID.create({ uuid });
    }
  } catch (err) { // just log error, do not fail if Webhooh UUID access fails...
    return nextError(next, err.message, unrecoverableErrorStatus);
  }

  /**
   * Get status from event, to transform unforeseen events to "unforeseen" status, to avoid db errors
   */
  let status = event;
  //let good;
  switch (event) {
  case "request": // fall down
  case "delivered": // fall down
  case "unique_opened": // fall down
  case "click": // fall down
    //good = true;
    break;
  case "hard_bounce":
  case "soft_bounce":
    status = "bounce";
    //good = false;
    break;
  case "invalid_email":
  case "blocked":
  case "spam":
  case "unsubscribed":
  case "error":
    //good = false;
    break;
  default:
    logger.warn(`Event ${event} is unforeseen...`);
    status = "unforeseen";
  }
  

  try {
    await Request.updateOne(
      {
        provider,
        providerMessageId,
      },
      {
        $set: {
          lastStatus: status,
          lastStatusUpdate: new Date(payload.date), // Note: status updates could arrive in mixed order, and with some seconds delay...
        },
        $push: {
          events: { status: status, at: new Date(payload.date) }
        }
      }
    );
    logger.info(`Completed webhook event ${event} registration`);
  } catch (err) {
    return nextError(next, err.message, unrecoverableErrorStatus, err.stack);
  }
  res.sendStatus(successStatus);
};

module.exports = {
  brevo,
};

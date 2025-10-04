const Request = require("../models/request.model");
const WebhookUUID = require("../models/WebhookUUID.model"); 
const { logger } = require("../controllers/logger.controller");
//const emailService = require("../services/email.service");
const { nextError } = require("../libs/misc");
//const { get } = require("mongoose");
//const config = require("../config");


const brevo = async (req, res, next) => {
  const payload = req.body;

  logger.info("Brevo webhook payload:", { payload });

  const successStatus = 200; // Success status - TODO: audit in case of errors
  const unrecoverableErrorStatus = 200; // Force unrecoverable errors to send a success status too, to stop being flooded by the provider with webhhoks calls

  // Brevo webhook includes `messageId`
  const provider = "Brevo";
  const providerMessageId = payload['message-id'] || payload.messageId;
  if (!providerMessageId) {
    return nextError(next, "No message-id in Brevo webhook", unrecoverableErrorStatus);
  }
  const event = payload.event; // E.g. "delivered", "open", "click", "hard_bounce"
  const uuid = payload.uuid; // Universally unique identifier

  /**
   * Check if uuid is new (otherwise ignore this request)
   */
  try {
    const oldWebhook = await WebhookUUID.findOneAndUpdate(
      { uuid },
      { $setOnInsert: { uuid } }, // If not found, insert new doc with uuid
      { upsert: true, new: true } // Return updated/new doc
    ).lean();
    if (oldWebhook.events && oldWebhook.events.some(ev => ev.status === event)) {
      // Same event already seen
      return nextError(next, `UUID ${uuid} is already seen, same event ${event}, ignoring`, unrecoverableErrorStatus);
    }
    if (oldWebhook.events && oldWebhook.events.length > 0) {
      // UUID existed, but new event type
      logger.info(`UUID ${uuid} is already seen, changed event, proceeding`);
    } else {
      // Newly inserted document
      logger.info(`UUID ${uuid} is new, proceeding`);
    }
  } catch (err) { // just log error, do not fail if Webhooh UUID access fails...
    return nextError(next, err.message, unrecoverableErrorStatus);
  }
  // try {
  //   const oldWebhook = await WebhookUUID.findOne({ uuid });
  //   //if (await WebhookUUID.exists({ uuid })) {
  //   if (oldWebhook) {
  //     if (oldWebhook.events && oldWebhook.events.some(ev => ev.status === event)) {
  //       return nextError(next, `UUID ${uuid} is already seen, same event ${event}, ignoring`, unrecoverableErrorStatus);
  //     }
  //     logger.info(`UUID ${uuid} is already seen, changed event, proceeding`);
  //   } else {
  //     logger.info(`UUID ${uuid} is new, proceeding`);
  //     await WebhookUUID.create({ uuid });
  //   }
  // } catch (err) { // Just log error, do not fail if Webhooh UUID access fails...
  //   return nextError(next, err.message, unrecoverableErrorStatus);
  // }

  /**
   * Get status from event, to transform unforeseen events to "unforeseen" status, to avoid db errors
   */
  let status = event;
  switch (event) {
  case "request":
    break;
  case "delivered":
    break;
  case "click":
    break;
  case "unique_opened":
    status = "opened";
    break;
  case "hard_bounce":
    break;
  case "soft_bounce":
    break;
  case "invalid_email":
    break;
  case "blocked":
    break;
  case "spam":
    break;
  case "unsubscribed":
    break;
  case "error":
    break;
  default:
    logger.warn(`Event ${event} is unforeseen...`);
    status = "unforeseen";
    break;
  }
  
  /**
   * Get current request to get all statuses history.
   * WebHooks do not necessarily arrive in order, so we store all events, and
   * consider the 'last' status the one with the highest priority, not the last arrived.
   * We store the lastStatus and lastStatusAt for easier querying.
   */
  let requestCurrent;
  try {
    requestCurrent = await Request.findOne({
      provider,
      providerMessageId,
    }).lean();
  } catch (err) {
    return nextError(next, `Cannot find request with message id ${providerMessageId}: ${err.message}`, unrecoverableErrorStatus, err.stack);
  }
  if (!requestCurrent) {
    return nextError(next, `No request found for ${providerMessageId}`, unrecoverableErrorStatus);
  }
  const eventDate = payload.date ? new Date(payload.date) : new Date();
  requestCurrent.events.push({ status, at: eventDate, reason: payload.reason }); // Push current event
  
  // Status updates could arrive in mixed order, and with some seconds delay...
  const [lastStatus, lastStatusDate, lastReason] = getHighestStatus(requestCurrent.events); 

  try {
    const result = await Request.updateOne(
      {
        provider,
        providerMessageId,
      },
      {
        $set: {
          events: requestCurrent.events, // Update all events
          lastStatus,
          lastStatusDate,
          lastReason
        },
      }
    );
    logger.info(`Completed webhook '${event}' event registration`, result);
  } catch (err) {
    return nextError(next, err.message, unrecoverableErrorStatus, err.stack);
  }
  /*
  try {
    await Request.updateOne(
      {
        provider,
        providerMessageId,
      },
      {
        $set: {
          lastStatus: status,
          lastStatusAt: new Date(payload.date), // Note: status updates could arrive in mixed order, and with some seconds delay...
        },
        $push: {
          events: { status: status, at: new Date(payload.date) }
        }
      }
    );
    logger.info(`Completed webhook '${event}' event registration`);
  } catch (err) {
    return nextError(next, err.message, unrecoverableErrorStatus, err.stack);
  }
  */
  res.sendStatus(successStatus);
};

const getHighestStatus = (events) => {
  if (!events || events.length === 0) return [null, null, null];

  const statuses = {
    "request": 1,
    "delivered": 2,
    "click": 3,
    "opened": 4,
    "hard_bounce": 5,
    "soft_bounce": 6,
    "invalid_email": 7,
    "blocked": 8,
    "spam": 9,
    "unsubscribed": 10,
    "error": 11,
    "unforeseen": 99
  };

  return events.reduce((best, current) => {
    const [bestStatus, bestAt] = best;
    const bestRank = bestStatus ? statuses[bestStatus] : -1;
    const currentRank = statuses[current.status];

    if (
      currentRank > bestRank ||
      (currentRank === bestRank && new Date(current.at) > new Date(bestAt))
    ) {
      return [current.status, current.at, current.reason];
    }
    return best;
  }, [null, null]);
};

module.exports = {
  brevo,
};

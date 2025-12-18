const { DateTime } = require("luxon");
const User = require("../models/user.model");
const Request = require("../models/request.model");
const { decryptData } = require("../libs/encryption");
const { logger } = require("../controllers/logger.controller");
const { updateUserJobsRaw } = require("../controllers/user.controller");
const emailService = require("../services/email.service");
const { audit } = require("../libs/messaging");
const { nextError, isAdministrator } = require("../libs/misc");
const config = require("../config");

const getRequests = async (req, res, next) => {
  const userId = req.userId;
  const requestedUserId = req.parameters.userId;
  const isAdmin = await isAdministrator(userId);

  // DEBUG ONLY: artificial delay response
  // const delay = ms => new Promise(resolve => setTimeout(resolve, ms * 1000));
  // await delay(5); // waiting 1 second.

  // only admins can get requests of other users
  if (!isAdmin && requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({ message: req.t("You must have admin role to get requests of another user") });
  }

  // filter requests on requestedUserId was specified, and force filter on current user id if not admin
  const filter = isAdmin ?
    (requestedUserId ? { userId: requestedUserId } : {}) :
    { userId: userId }
  ;

  try {
    // get all requests
    const requests = await Request.find(filter)
      .select()
      .lean()
      .exec()
    ;
    
    return res.json({
      requests,
    });
  } catch (err) { // catch requestSend exceptions
    return nextError(next, req.t("Error getting requests: {{err}}", { err: err.message }), 500, err.stack);
  }
};

// // Normalize a JS date to start-of-day UTC
// function toDay(date) {
//   return DateTime.fromJSDate(date).toUTC().startOf('day').toJSDate();
// }

// // Determine whether a medicine is due today
// function isMedicineDue(med) {
//   const start = DateTime.fromISO(med.startDate).toUTC().startOf('day');
//   const today = DateTime.utc().startOf('day');
//   const diff = Math.floor(today.diff(start, 'days').days);
//   return diff >= 0 && diff % med.frequency === 0;
// }

// // Build email payload for one job (may include multiple medicines)
// function buildRequestPayload(job, dueMeds) {
//   return {
//     userId: job.userId,
//     jobId: job.id,
//     patientName: job.patientName,
//     patientSurname: job.patientSurname,
//     patientEmail: job.patientEmail,
//     doctorName: job.doctorName,
//     doctorEmail: job.doctorEmail,
//     medicines: dueMeds.map(m => ({
//       name: m.name,
//       startDate: m.startDate,
//       frequency: m.frequency,
//     })),
//   };
// }

function isTodayAMultiple(startDate, frequencyDays) {
  const today = DateTime.now().startOf("day");
  const daysDiff = today.diff(startDate, "days").days;
  return daysDiff >= 0 && Math.floor(daysDiff) % frequencyDays === 0;
}

const runJobs = async (req, res, next) => {
  const requestSend = async (req, user, jobs, job, emailTemplate, medicines) => {
    let request;
    let response;
    response = await emailService.send(req, {
      fromName:
        (user.firstName && user.lastName) ?
          `${user.firstName} ${user.lastName}` :
          (job.patient.firstName && job.patient.lastName) ?
            `${job.patient.firstName} ${job.patient.lastName}` :
            config.email.fromName,
      to: job.doctor.email,
      toName: job.doctor.name,
      replyTo: job.patient.email,
      replyToName: `${job.patient.firstName} ${job.patient.lastName}`,
      subject: emailTemplate.subject,
      htmlContent: variablesExpand(req, emailTemplate.body, job, medicines, user),
      tags: [
        process.env.BREVO_WEBHOOK_SECRET,
        config.email.trackTag,
      ],
    });
    const messageId = response.messageId;
    logger.info("Request sent via email");

    try {
      const event = {
        status: "create",
        reason: "",
      };

      // create request with lastSendDay set to today (midnight)
      const today = DateTime.now().startOf("day").toJSDate();
      request = await Request.create({
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        provider: config.email.provider,
        providerMessageId: messageId,
        patientFirstName: job.patient.firstName,
        patientLastName: job.patient.lastName,
        patientEmail: job.patient.email,
        doctorName: job.doctor.name,
        doctorEmail: job.doctor.email,
        medicines: medicines.map((med) => ({
          name: med.name,
          since: DateTime.fromJSDate(new Date(med.fieldSinceDate)).toJSDate(),
          every: med.fieldFrequency,
        })),
        userId: user._id,
        jobId: job.id,
        events: [event],
        lastSendDay: today,
      });

      logger.info("New request created");
    } catch (err) {
      return nextError(next, err.message, 500, err.stack);
    }

    // update lastDate for this medicine job data
    const jobsNew = jobs.map((j) => {
      if (j.id === job.id) {
        j.medicines = j.medicines.map((med) => {
          if (medicines.some((medicine) => medicine.name === med.name)) {
            med.fieldLastDate = DateTime.now().toUTC().toISODate();
          }
          return med;
        });
      }
      return j;
    });

    // Update medicine last request date
    req.userId = user._id;
    response = await updateUserJobsRaw(req, jobsNew);
    if (response.error) {
      return nextError(next, response.message, response.status ?? 500);
    } else {
      logger.info("Updated medicine last date");
    }

    return request;
  };

  try {
    logger.info(`Processing all users ***`);
    const users = await User.find().select(["-password", "-__v"]).lean().exec();

    let requestsCount = 0;
    let requestsDetailsForAudit = "";

    for (const user of users) {
      logger.info(` Processing user ${user._id} (${user.email}, ${user.firstName} ${user.lastName}) ***`);

      if (!user.email) {
        logger.warn(` User has no email, skipping it`);
        continue;
      }

      if (!user.encryptionKey) {
        logger.warn(` User has no encryption key, skipping it`);
        continue;
      }

      if (!user.jobs) {
        logger.warn(` User has no jobs data, skipping it`);
        continue;
      }

      const jobs = await decryptData(user.jobs, user.encryptionKey);
      const emailTemplate = user.emailTemplate;
      req.user = user;

      logger.info(` Processing all user jobs (total: ${jobs.length}) **`);

      for (const job of jobs) {
        logger.info(`  Processing job ${job.id} **`);
        const medicines = [];

        if (!job.isActive) {
          logger.info(`  Job is not active, skipping it`);
          continue;
        }
        if (!job.doctor?.name) {
          logger.warn(`  Job has no doctor name, skipping it`);
          continue;
        }
        if (!job.doctor?.email) {
          logger.warn(`  Job has no doctor email, skipping it`);
          continue;
        }
        if (!emailTemplate?.subject) {
          logger.warn(`  Job has no email template subject, skipping it`);
          continue;
        }
        if (!emailTemplate?.body) {
          logger.warn(`  Job has no email template body, skipping it`);
          continue;
        }

        logger.info(`   Processing all medicines for this job (total: ${job.medicines.length}) *`);

        const today = DateTime.now().startOf("day");
        for (const medicine of job.medicines) {
          logger.info(`    Processing medicine ${medicine.name} *`);

          if (!medicine.fieldSinceDate) {
            logger.warn(`     Medicine has no fieldSinceDate, skipping it`);
            continue;
          }
          if (!medicine.fieldFrequency) {
            logger.warn(`     Medicine has no fieldFrequency, skipping it`);
            continue;
          }
          if (!Number.isInteger(medicine.fieldFrequency) || medicine.fieldFrequency <= 0) {
            logger.warn(`     Medicine fieldFrequency is not a positive integer, skipping it`);
            continue;
          }

          const sinceDate = DateTime.fromJSDate(new Date(medicine.fieldSinceDate)).startOf("day");
          const frequencyDays = parseInt(medicine.fieldFrequency);

          logger.info(`     Medicine sinceDate is ${sinceDate.toISODate()}`);
          logger.info(`     Medicine has a frequency of ${frequencyDays} days`);

          let lastDate, nextDate;

          if (medicine.fieldLastDate) {
            lastDate = DateTime.fromJSDate(new Date(medicine.fieldLastDate)).startOf("day");
            logger.info(`     Medicine lastDate is ${lastDate.toISODate()}`);
            if (sinceDate > lastDate) { // This could happen if user postpones sinceDate after lastDate
              lastDate = null;
              nextDate = sinceDate;
              logger.info(`     Medicine sinceDate is after lastDate, ignoring lastDate to calculate nextDate...`);
            } else {
              nextDate = lastDate.plus({ days: frequencyDays });
              logger.info(`     Medicine nextDate set to lastDate (${lastDate.toISODate()}) + frequencyDays (${frequencyDays}) ...`);
            }
          } else {
            lastDate = null;
            nextDate = sinceDate;
            logger.info(`     Medicine has no lastDate, it was never requested`);
          }

          logger.info(`     Medicine nextDate is ${nextDate.toISODate()}`);

          if (sinceDate > today) {
            logger.info(`     Medicine sinceDate is in the future, skipping it`);
            continue;
          }

          let isDue = false;

          if (nextDate < today) {
            if (!lastDate && isTodayAMultiple(sinceDate, frequencyDays)) {
              isDue = true;
              logger.info(`     Medicine is due today (first request)`);
            } else {
              isDue = false;
              logger.info(`     Medicine next date is in the past, not due`);
            }
          } else if (nextDate.equals(today)) {
            if (!lastDate || !lastDate.equals(today)) {
              isDue = true;
              logger.info(`     Medicine is due today`);
            } else {
              isDue = false;
              logger.info(`     Medicine already requested today, skipping`);
            }
          } else {
            isDue = false;
            logger.info(`     Medicine next date is in the future, not due`);
          }

          if (isDue) {
            medicines.push(medicine);
          }
        }

        if (medicines.length) {
          try {
            let request;
            if (config.app.ui.jobs.unifyRequests) {
              request = await requestSend(req, user, jobs, job, emailTemplate, medicines);
              requestsCount++;
            } else {
              for (const medicine of medicines) {
                request = await requestSend(req, user, jobs, job, emailTemplate, [medicine]);
                requestsCount++;
              }
            }

            requestsDetailsForAudit += `
User: ${request.userFirstName} ${request.userLastName} &lt;${request.userEmail}&gt;<br />
Patient: ${request.patientFirstName} ${request.patientLastName} &lt;${request.patientEmail}&gt;<br />
Doctor: ${request.doctorName} &lt;${request.doctorEmail}&gt;<br />
Medicines:<br />
${request.medicines.map(med => ` - ${med.name}, since ${med.since.toISOString()} every ${parseInt(med.every)} day(s)`).join('<br />')}
<hr /><br />`;
          } catch (err) {
            return nextError(next, req.t("Error sending requests: {{err}}", { err: err.message }), 500, err.stack);
          }
        }
      }
    }

    logger.info("Done processing all users jobs.");
    audit({
      req,
      mode: "scheduler",
      subject: "Processed all users jobs",
      htmlContent:
        `Sent ${requestsCount} request(s)` +
        (requestsCount > 0 ? `:<br /><br />${requestsDetailsForAudit}` : ""),
    });

    return res.json({
      message: `Processed all users jobs, sent ${requestsCount} medicine request(s).`,
    });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

/*
const ORIGINAL_runJobs = async (req, res, next) => {
  const requestSend = async (req, user, jobs, job, emailTemplate, medicines, now) => {
    let request;
    let response;
    response = await emailService.send(req, {
      fromName:
        (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` :
          (job.patient.firstName && job.patient.lastName) ? `${job.patient.firstName} ${job.patient.lastName}` :
            config.email.fromName,
      to: job.doctor.email,
      toName: job.doctor.name,
      replyTo: job.patient.email,
      replyToName: `${job.patient.firstName} ${job.patient.lastName}`,
      subject: emailTemplate.subject,
      htmlContent: variablesExpand(req, emailTemplate.body, job, medicines, user),
      tags: [
        process.env.BREVO_WEBHOOK_SECRET, // to be used in the webhook to authenticate a request to track
        config.email.trackTag, // to be used in the webhook to identify a request to track
      ],
    });
    const messageId = response.messageId;
    logger.info("Request sent via email");

    try {
      const event = {        
        status: "create",
        /*, at field is automatically filled * /
        reason: "",
      };
      request = await Request.create({
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userEmail: user.email,
        provider: config.email.provider,
        providerMessageId: messageId,
        patientFirstName: job.patient.firstName,
        patientLastName: job.patient.lastName,
        patientEmail: job.patient.email,
        doctorName: job.doctor.name,
        doctorEmail: job.doctor.email,
        medicines: medicines.map((med) => ({
          //id: med.id,
          name: med.name,
          since: new Date(med.fieldSinceDate),
          every: med.fieldFrequency
        })),
        userId: user._id,
        jobId: job.id,
        events: [event],
        // lastStatus: event.status,
        // lastReason: event.reason,
      });
      //logger.info("New request created:", request);
      logger.info("New request created");
    } catch (err) {
      return nextError(next, err.message, 500, err.stack);
    }
    
    // update lastDate for this medicine job data
    const jobsNew = jobs.map((j) => {
      if (j.id === job.id) {
        j.medicines = j.medicines.map((med) => {
          if (medicines.some(medicine => medicine.name === med.name)) { // check if the job medicine is in the passed medicines list
            med.fieldLastDate = now; // it is in the passed medicines list, set this medicine fieldLastDate to now
          }
          return med;
        });
      }
      return j;
    });

    req.userId = user._id; // to be used in updateUserJobsRaw
    response = await updateUserJobsRaw(req, jobsNew);
    if (response.error) {
      return nextError(next, response.message, response.status ?? 500);
    } else {
      logger.info("Updated medicine last date");
    }

    return request;
  };

  try {
    logger.info(`Processing all users ***`);
    // get all users, to get all jobs to be sent
    const users = await User.find()
      .select(["-password", "-__v"])
      .lean()
      .exec()
    ;
    
    let requestsCount = 0;
    let requestsDetailsForAudit = "";
    for (const user of users) {
      logger.info(` Processing user ${user._id} (${user.email}, ${user.firstName} ${user.lastName}) ***`);

      if (!user.email) {
        logger.warn(` User has no email, skipping it`);
        continue;
      }

      // get user jobs (encrypted)
      if (!user.encryptionKey) {
        logger.warn(` User has no encryption key, skipping it`);
        continue;
      }

      if (!user.jobs) {
        logger.warn(` User has no jobs data, skipping it`);
        continue;
      }

      const jobs = await decryptData(user.jobs, user.encryptionKey);
      
      const emailTemplate = user.emailTemplate;
      req.user = user; // to be used in emailService.send

      logger.info(` Processing all user jobs (total: ${jobs.length}) **`);

      for (const job of jobs) {
        logger.info(`  Processing job ${job.id} **`);
        const medicines = []; // list of medicines to be requested now for this job
        //logger.info(`job:`, job);

        if (!job.isActive) {
          logger.info(`  Job is not active, skipping it`);
          continue;
        }
        // if (!job.isConfirmed) {
        //   logger.info(`Job is not confirmed, skipping it`);
        //   continue;
        // }
        if (!job.doctor?.name) {
          logger.warn(`  Job has no doctor name, skipping it`);
          continue;
        }
        if (!job.doctor?.email) {
          logger.warn(`  Job has no doctor email, skipping it`);
          continue;
        }
        if (!emailTemplate?.subject) {
          logger.warn(`  Job has no email template subject, skipping it`);
          continue;
        }
        if (!emailTemplate?.body) {
          logger.warn(`  Job has no email template body, skipping it`);
          continue;
        }

        logger.info(`   Processing all medicines for this job (total: ${job.medicines.length}) *`);

        const nowDate = new Date().yyyymmdd();
        for (const medicine of job.medicines) {

          logger.info(`    Processing medicine ${medicine.name} *`);

          // check time is due for a request
          if (!medicine.fieldSinceDate) {
            logger.warn(`     Medicine has no fieldSinceDate, skipping it`);
            continue;
          }
          if (!medicine.fieldFrequency) {
            logger.warn(`     Medicine has no fieldFrequency, skipping it`);
            continue;
          }

          const sinceDate = new Date(medicine.fieldSinceDate).yyyymmdd();
          const frequencyDays = parseInt(medicine.fieldFrequency);
          logger.info(`     Medicine sinceDate is ${sinceDate}`);
          logger.info(`     Medicine has a frequency of ${frequencyDays} days`);
          let lastDate;
          let nextDate;
          if (medicine.fieldLastDate) {
            lastDate = new Date(medicine.fieldLastDate);
            nextDate = lastDate.addDays(frequencyDays).yyyymmdd();
            lastDate = lastDate.yyyymmdd();
            logger.info(`     Medicine lastDate is ${lastDate}`);
          } else {
            logger.info(`     Medicine has no lastDate, it was never requested`);
            lastDate = "";
            nextDate = sinceDate;
          }
          logger.info(`     Medicine nextDate is ${nextDate}`);
          
          if (sinceDate > nowDate) {
            logger.info(`     Medicine sinceDate is in the future, should not yet be requested, skipping it`);
            continue;
          }

          logger.info(`     Medicine sinceDate is not in the future, proceeding to check frequency`); // TODO: remove this log, DEBUG ONLY
          let isDue = false;
          if (nextDate < nowDate) { // next date is in the past
            if (!lastDate) { // if lastDate is not set, this is the first request
              if (isTodayAMultiple(sinceDate, frequencyDays)) { // check if today is a multiple of frequency days since sinceDate
                isDue = true;
                logger.info(`     Medicine lastDate is not set, this is the first request, today is a multiple of frequency days since sinceDate, it is due!`);
              } else {
                isDue = false;
                logger.info(`     Medicine lastDate is not set, this is the first request, today is not a multiple of frequency days since sinceDate, it is not due`);
              }
            } else {
              isDue = false;
              logger.info(`     Medicine next date is in the past, it is not due`);
            }
          } else if (nextDate === nowDate) { // next date is today
            if (lastDate !== nowDate) { // if lastDate is not set or not today, this is the first request for today so it is due 
              isDue = true;
              logger.info(`     Medicine nextDate is now, it has not already requested today, it is due!`);
            } else { // if lastDate is today, this is a subsequent request and was already sent today, so it is not due
              isDue = false;
              logger.info(`     Medicine nextDate is now, but it was already requested today, it is not due`);
            }
          } else { // next date is in the future
            isDue = false;
            logger.info(`     Medicine nextDate is in the future, it is not due`);
          }

          if (isDue) { // Time is due to request this medicine
            medicines.push(medicine);
          }
        }

        // one or more medicines are due for this job, requesting them
        if (medicines.length) {
          try {
            let request;
            if (config.app.ui.jobs.unifyRequests) { // unify requests, all medicines for this user for this job for today are requested with a unique email
              if (medicines.length === 1) {
                logger.info(`1 medicine (${medicines[0].name}) is being requested`);
              } else {
                logger.info(`${medicines.length} medicines (${medicines.map(med => med.name).join(', ')}) are being requested, unified`);
              }
              request = await requestSend(req, user, jobs, job, emailTemplate, medicines, nowDate);
              requestsCount++;
            } else { // do not unify requests, all medicines for this user for this job for today are requested with separate emails
              for (const medicine of medicines) {
                logger.info(`Medicine ${medicine.name} is being requested, separately`);
                request = await requestSend(req, user, jobs, job, emailTemplate, [medicine], nowDate);
                requestsCount++;
              }
            }
            requestsDetailsForAudit += `
User: ${request.userFirstName} ${request.userLastName} &lt;${request.userEmail}&gt;<br />
Patient: ${request.patientFirstName} ${request.patientLastName} &lt;${request.patientEmail}&gt;<br />
Doctor: ${request.doctorName} &lt;${request.doctorEmail}&gt;<br />
Medicines:<br />
${request.medicines.map(medicine => ` - ${medicine.name}, since ${medicine.since.toISOString()} every ${parseInt(medicine.every)} day(s)`).join('<br />')}
<hr /><br />`;
          } catch (err) { // catch requestSend exceptionsparseInt(medicine.fieldFrequency)
            return nextError(next, req.t("Error sending requests: {{err}}", { err: err.message }), 500, err.stack);
          }
        }
      }
    }
    logger.info('Done processing all users jobs.');
    audit({
      req,
      mode: "scheduler",
      subject: "Processed all users jobs",
      htmlContent: `
      Sent ${requestsCount} request(s)` + (requestsCount > 0 ? `:<br />
      <br />
      ${requestsDetailsForAudit}
      ` : ''),
    });

    return res.json({
      message: `Processed all users jobs, sent ${requestsCount} medicine request(s).`
    });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

function isTodayAMultiple(startDateString, frequencyDays) {
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  
  const start = new Date(startDateString);
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  
  const daysDiff = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return daysDiff >= 0 && daysDiff % frequencyDays === 0;
}

*/

/**
 * Check if user requests are not fully used already
 */
const checkUserJobRequests = async (req, res, next) => {
  const userId = req.userId;
  const medicines = req.parameters.medicines;
  
  try {
    if (!userId) {
      //return res.status(403).json({ error: true, message: 'Jobs required' });
      return res.json({ err: true, status: 403, message: req.t("User id is required") });
    }
    if (!medicines) {
      //return res.status(400).json({ error: true, message: 'Jobs required' });
      return res.json({ err: true, status: 400, message: req.t("Medicines is required") });
    }

    const user = await User.findOne({ _id: req.userId });
    const jobs = user.jobs ? await decryptData(user.jobs, user.encryptionKey) : [];

    //const requestsTot = jobs.reduce((total, job) => total + job.medicines.length, 0);
    const requestsCurrent = medicines.length;
    const requestsPresent = jobs.reduce((sum, job) => sum + job.medicines.length, 0);
    const requestsTot = requestsPresent + requestsCurrent;
    const requestsMax = config.app.ui.jobs.maxRequestsPerUser;
    logger.info("requestsCurrent:", requestsCurrent, "- requestsPresent:", requestsPresent);
    logger.info("requestsTot:", requestsTot, "- requestsMax:", requestsMax);
    if (requestsTot >= requestsMax) {
      return res.json({ status: 200, check: false, message: req.t("Sorry, currently the maximum number of total medicine requests per user is {{n}}", { n: requestsMax }) });
    }
    return res.json({ status: 200, check: true, message: req.t("The number of total medicine requests ({{requestsTot}} are lower than maximum allowed ({{requestsMax}}", { requestsTot, requestsMax }) });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

/**
 * Get request errors for user
 */
const getRequestErrors = async (req, res, next) => {
  const userId = req.userId;
  const since = req.parameters.since;
  
  try {
    if (!userId) {
      return res.json({ err: true, status: 403, message: req.t("User id is required") });
    }
    // if (!since) {
    //   return res.json({ err: true, status: 400, message: req.t("Since date is required") });
    // }

    const filter = {};
    filter.userId = req.userId; // Get all requests for this user
    if (since) { // Get all requests after requested date
      filter.createdAt = { $gt: since };
    }

    const errorStatuses = [
      "hard_bounce",
      "soft_bounce", // soft_bounce is an error too...
      "invalid_email",
      "blocked",
      "spam",
      "unsubscribed",
      "error",
      "deferred",
      "unforeseen",
    ];

    try {
      // get all requests
      const requests = await Request.find(filter)
        .select()
        .lean()
        .exec()
      ;
      const requestErrors = requests
        .flatMap(req => req.events
          .filter(ev => errorStatuses.includes(ev.status))
          .map(ev => ({
            status: ev.status,
            at: ev.at,
            seenAt: ev.seenAt,
          }))
        )
      ;
      logger.info("requestErrors:", requestErrors); // DEBUG ONLY

      return res.json({ status: 200, requestErrors });
    } catch (err) { // catch requestSend exceptions
      return nextError(next, req.t("Error getting requests: {{err}}", { err: err.message }), 500, err.stack);
    }
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

/**
 * Set all request errors for user as seen
 */
const setRequestErrorsSeen = async (req, res, next) => {
  const userId = req.userId;

  try {
    if (!userId) {
      return res.json({ err: true, status: 403, message: req.t("User id is required") });
    }

    const now = new Date();

    // Set all 'unseen' requests for this user as seen now
    const result = await Request.updateMany(
      { userId },
      { $set: { "events.$[elem].seenAt": now } },
      { arrayFilters: [{ "elem.seenAt": null }] }
    );
    logger.info("Result of Request.updateMany:", result); // DEBUG ONLY
    /**
     * result:
     * {
     *   acknowledged: true,
     *   matchedCount: 42,
     *   modifiedCount: 37
     * }
     */
    return res.status(200).json({ message: "request errors seet as seen" });
  } catch (err) {
    return nextError(next, req.t("Error updating user: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

/*
const nextScheduledDate = (origStr, freq) => {
  const orig = new Date(origStr);       // ORIG (YYYY-MM-DD)
  const today = new Date();             // Now
  today.setHours(0, 0, 0, 0);           // normalize to midnight

  // difference in days between today and ORIG
  const diffDays = Math.floor((today - orig) / (1000 * 60 * 60 * 24));

  let steps;
  if (diffDays >= 0 && diffDays % freq === 0) {
    // today is already on the schedule
    steps = diffDays / freq;
  } else {
    // round up to the next multiple
    steps = diffDays > 0 ? Math.ceil(diffDays / freq) : 0;
  }

  const next = new Date(orig);
  next.setDate(orig.getDate() + steps * freq);

  return next.toISOString().slice(0, 10);  // YYYY-MM-DD
}
*/

const variablesExpand = (req, html, job, /*medicineId*/medicines, user) => { // TODO: client/server duplicated code...
  // Variable tokens
  const variableTokens = {
    [req.t('[DOCTOR NAME]')]: (job, _medicines, _user) => job?.doctor?.name ?? req.t('[DOCTOR NAME]'),
    [req.t('[PATIENT NAME]')]: (job, _medicines, _user) =>
      (job?.patient?.firstName || job?.patient?.lastName) ? `${job?.patient?.firstName} ${job?.patient?.lastName}` : req.t('[PATIENT NAME]'),
    //[req.t('[MEDICINE NAME]')]: (job) => job?.medicines?.find(med => medicineIds.includes(med.id)/*med.id === medicineId*/).name ?? req.t('[MEDICINE NAME]'),
    [req.t('[MEDICINE NAME]')]: (_job, medicines, _user) => medicines.map(med => med.name).join('<br />') ?? req.t('[MEDICINE NAME]'),
    [req.t('[USER NAME]')]: (_job, _medicines, user) => user?.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : req.t('[USER NAME]'),
    [req.t('[USER EMAIL]')]: (_job, _medicines, user) => user?.email ?? req.t('[USER EMAIL]'),
  };

  Object.entries(variableTokens).forEach((token) => {
    let replacement = variableTokens[token[0]](job, medicines, user);
    html = html.replaceAll(token[0], replacement);
  });
  return html;
};

module.exports = {
  getRequests,
  runJobs,
  checkUserJobRequests,
  getRequestErrors,
  setRequestErrorsSeen,
};

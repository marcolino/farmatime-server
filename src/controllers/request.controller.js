const User = require("../models/user.model");
const Request = require("../models/request.model");
const { decryptData } = require("../libs/encryption");
const { logger } = require("../controllers/logger.controller");
const { updateUserJobsLocal } = require("../controllers/user.controller");
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

const runJobs = async (req, res, next) => {
  const requestSend = async (req, user, jobs, job, emailTemplate, medicines, now) => {
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
    logger.info("    request sent via email");

    try {
      const status = { label: "created" /*, at field is automatically filled */, reason: "" };
      const request = await Request.create({
        userFirstName: user.firstName,
        userLastName: user.lastName,
        provider: config.email.provider,
        providerMessageId: messageId,
        patientFirstName: job.patient.firstName,
        patientLastName: job.patient.lastName,
        patientEmail: job.patient.email,
        doctorName: job.doctor.name,
        doctorEmail: job.doctor.email,
        medicines: medicines.map((med) => ({
          id: med.id,
          name: med.name,
          since: new Date(med.fieldSinceDate),
          every: med.fieldFrequency
        })),
        userId: user._id,
        jobId: job.id,
        statuses: [status],
        lastStatus: status.label,
        lastReason: status.reason,
      });
      logger.info("New request created:", request);
    } catch (err) {
      return nextError(next, err.message, 500, err.stack);
    }
    
    // update lastDate for this medicine job data
    const jobsNew = jobs.map((j) => {
      if (j.id === job.id) {
        j.medicines = j.medicines.map((med) => {
          //if (med.id === medicine.id) {
          med.fieldLastDate = now.toISOString();
          //}
          return med;
        });
      }
      return j;
    });

    req.userId = user._id; // to be used in updateUserJobsLocal
    response = await updateUserJobsLocal(req, jobsNew);
    if (response.error) {
      return nextError(next, response.message, response.status ?? 500);
    } else {
      logger.info("    updated medicine last date");
    }
  };

  try {
    // get all users, to get all jobs to be sent
    const users = await User.find()
      .select(["-password", "-__v"])
      .lean()
      .exec()
    ;
    
    let requestsCount = 0;
    for (const user of users) {
      logger.info(`- Processing user ${user._id} (${user.email}, ${user.firstName} ${user.lastName})`);

      if (!user.email) {
        logger.warn(`  User ${user._id} (${user.firstName} ${user.lastName}) has no email, skipping it`);
        continue;
      }

      // get user jobs (encrypted)
      if (!user.encryptionKey) {
        logger.warn(`  User ${user._id} (${user.firstName} ${user.lastName}) has no encryption key, skipping it`);
        continue;
      }

      if (!user.jobs) {
        logger.warn(`  User ${user._id} (${user.firstName} ${user.lastName}) has no jobs data, skipping it`);
        continue;
      }

      const jobs = await decryptData(user.jobs, user.encryptionKey);
      const emailTemplate = user.emailTemplate;
      req.user = user; // to be used in emailService.send

      for (const job of jobs) {
        const medicines = []; // array of medicines to be requested now for this job
        //logger.info(`  job:`, job);

        if (!job.isActive) {
          logger.info(`  job ${job.id} is not active, skipping it`);
          continue;
        }
        // if (!job.isConfirmed) {
        //   logger.info(`  job ${job.id} is not confirmed, skipping it`);
        //   continue;
        // }
        if (!job.doctor?.name) {
          logger.info(`  job ${job.id} has no doctor name, skipping it`);
          continue;
        }
        if (!job.doctor?.email) {
          logger.info(`  job ${job.id} has no doctor email, skipping it`);
          continue;
        }
        if (!emailTemplate?.subject) {
          logger.info(`  job ${job.id} has no email template subject, skipping it`);
          continue;
        }
        if (!emailTemplate?.body) {
          logger.info(`  job ${job.id} has no email template body, skipping it`);
          continue;
        }

        logger.info(` - Processing job ${job.id}`);

        const nowDate = new Date();
        for (const medicine of job.medicines) {

          logger.info(`  - Processing medicine ${medicine.id} (${medicine.name})`);

          // check time is due for a request
          if (!medicine.fieldSinceDate) {
            logger.info(`  medicine ${medicine.id} has no field date, skipping it`);
            continue;
          }
          if (!medicine.fieldFrequency) {
            logger.info(`  medicine ${medicine.id} has no field frequency, skipping it`);
            continue;
          }

          const sinceDate = new Date(medicine.fieldSinceDate);  
          const lastDate = new Date(medicine.fieldLastDate ?? new Date("1970-01-01")); // default to a very old date if last send date is not set
          const frequencyDays = parseInt(medicine.fieldFrequency);

          if (sinceDate.yyyymmdd() > nowDate.yyyymmdd()) {
            logger.info(`    medicine ${medicine.id} should not yet be requested (since ${sinceDate.yyyymmdd()}), skipping it`);
            continue;
          }

          const nextDate = lastDate.addDays(frequencyDays);
          //const nextDate = nextScheduledDate(frequencyDays)
          //logger.info(`    medicine nextDate is ${nextDate.yyyymmdd()}`); // ...
          if (nextDate.yyyymmdd() > nowDate.yyyymmdd()) {
            logger.info(`    medicine ${medicine.id} is not due yet (next ${nextDate.yyyymmdd()}), skipping it`);
            continue;
          }

          // time is due for a request for this medicine
          logger.info(`    medicine ${medicine.id} is due (next ${nextDate.yyyymmdd()})`);
          medicines.push(medicine);
        }

        // one or more medicines are due for this job, requesting them
        if (medicines.length) {
          try {
            if (config.app.ui.jobs.unifyRequests) { // unify requests, all medicines for this user for this job for today are requested with a unique email
              logger.info(`    ${medicines.length} medicines ${medicines.map(med => med.id).join(', ')} are being requested, unified`);
              await requestSend(req, user, jobs, job, emailTemplate, medicines, nowDate);
              requestsCount++;
            } else { // do not unify requests, all medicines for this user for this job for today are requested with separate emails
              for (const medicine of medicines) {
                logger.info(`    medicine ${medicine.id} is being requested, separately`);
                await requestSend(req, user, jobs, job, emailTemplate, [medicine], nowDate);
                requestsCount++;
              }
            }
          } catch (err) { // catch requestSend exceptions
            return nextError(next, req.t("Error sending requests: {{err}}", { err: err.message }), 500, err.stack);
          }
        }
      }
    }
    logger.info('- Done processing all users jobs medicines.');
    audit({
      req, mode: "scheduler", subject: "Processed all users jobs medicines", htmlContent: `Sent ${requestsCount} request(s).`
    });

    return res.json({
      message: `Processed all users jobs medicines, sent ${requestsCount} medicine request(s).`
    });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

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
      return res.json({ err: false, status: 200, check: false, message: req.t("Sorry, currently the maximum number of total medicine requests per user is {{n}}", { n: requestsMax }) });
    }
    return res.json({ err: false, status: 200, check: true, message: req.t("The number of total medicine requests ({{requestsTot}} are lower than maximum allowed ({{requestsMax}}", { requestsTot, requestsMax }) });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
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
};

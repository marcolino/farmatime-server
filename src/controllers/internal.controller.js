const User = require("../models/user.model");
const { decryptData } = require("../libs/encryption");
const { logger } = require("../controllers/logger.controller");
const { updateUserJobsInternal } = require("../controllers/user.controller");
const emailService = require("../services/email.service");
const { audit } = require("../libs/messaging");
const { nextError } = require("../libs/misc");
const config = require("../config");

const runJobs = async (req, res, next) => {
  const requestSend = async (req, user, jobs, job, emailTemplate, medicines, now) => {
    await emailService.send(req, {
      to: job.doctor.email,
      toName: job.doctor.name,
      replyTo: job.patient.email,
      replyToName: `${job.patient.firstName} ${job.patient.lastName}`,
      subject: emailTemplate.subject,
      htmlContent: variablesExpand(req, emailTemplate.body, job, medicines, user),
    });
    logger.info("    request sent via email");

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
    await updateUserJobsInternal(req, req.user._id, jobsNew);
    logger.info("    updated medicine last date");
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
          const lastDate = new Date(medicine.fieldLastDate ?? new Date("1970-01-01")); // default to a very old date if not set
          const frequencyDays = parseInt(medicine.fieldFrequency);

          if (sinceDate.yyyymmdd() > nowDate.yyyymmdd()) {
            logger.info(`    medicine ${medicine.id} should not yet be requested (since ${sinceDate.yyyymmdd()}), skipping it`);
            continue;
          }

          const nextDate = lastDate.addDays(frequencyDays);
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
      message: `Processed all users jobs medicines, sent ${requestsCount} request(s).`
    });
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }
};

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
  runJobs,
};

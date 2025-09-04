const User = require("../models/user.model");
const { decryptData } = require("../helpers/encryption");
const { logger } = require("../controllers/logger.controller");
const { updateUserJobsDataInternal } = require("../controllers/user.controller");
const emailService = require("../services/email.service");
const { nextError } = require("../helpers/misc");
//const config = require("../config");

const runJobs = async (req, res, next) => {
  try {
    // get all users, to get all jobs to be sent
    const users = await User.find()
      .select(["-password", "-__v"])
      .lean()
      .exec()
    ;
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

      if (!user.jobsData) {
        logger.warn(`  User ${user._id} (${user.firstName} ${user.lastName}) has no jobs data, skipping it`);
        continue;
      }

      const jobsData = await decryptData(user.jobsData, user.encryptionKey);
      const jobs = jobsData?.jobs;

      req.user = user; // to be used in emailService.send

      for (const job of jobs) {
        //logger.info(`  job:`, job);

        if (!job.isActive) {
          logger.info(`  job ${job.id} is not active, skipping it`);
          continue;
        }
        if (!job.isConfirmed) {
          logger.info(`  job ${job.id} is not confirmed, skipping it`);
          continue;
        }
        if (!job.doctor?.name) {
          logger.info(`  job ${job.id} has no doctor name, skipping it`);
          continue;
        }
        if (!job.doctor?.email) {
          logger.info(`  job ${job.id} has no doctor email, skipping it`);
          continue;
        }
        if (!job.emailTemplate?.subject) {
          logger.info(`  job ${job.id} has no email template subject, skipping it`);
          continue;
        }
        if (!job.emailTemplate?.body) {
          logger.info(`  job ${job.id} has no email template body, skipping it`);
          continue;
        }

        logger.info(` - Processing job ${job.id}`);

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

          const nowDate = new Date();
          const sinceDate = new Date(medicine.fieldSinceDate);  
          const lastDate = new Date(medicine.fieldLastDate ?? "1970-01-01"); // default to a very old date if not set
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
          logger.info(`    medicine ${medicine.id} is due (next ${nextDate.yyyymmdd()}), REQUESTING!`);
          await emailService.send(req, {
            to: job.doctor.email,
            toName: job.doctor.name,
            replyTo: job.patient.email,
            replyToName: `${job.patient.firstName} ${job.patient.lastName}`,
            subject: job.emailTemplate.subject,
            htmlContent: variablesExpand(req, job.emailTemplate.body, job, medicine.id, user),
          });

          logger.info("    request sent via email");

          // update lastDate for this medicine job data
          const jobsDataNew = jobsData; 
          jobsDataNew.jobs = jobsData.jobs.map((jobData) => {
            if (jobData.id === job.id) {
              jobData.medicines = jobData.medicines.map((med) => {
                if (med.id === medicine.id) {
                  med.fieldLastDate = nowDate.toISOString();
                }
                return med;
              });
            }
            return jobData;
          });
          try {
            const result = await updateUserJobsDataInternal(req.user._id, jobsDataNew);
            if (result.error) {
              return res.status(result.status).json({
                error: true,
                message: req.t(result.message),
              });
            }
            logger.info("    updated medicine last date");
          } catch (err) { // this error is very important, we could end up sending requests more frequently than requested!!!
            return nextError(next, req.t("Error updating user job data: {{err}} !!!", { err: err.message }), 500, err.stack);
          }
          // const updateResult = await updateUserJobsData(req, {
          //   "userId": user._id,
          //   "jobsData": jobsDataNew,
          // });

        }
      }
    }
    logger.info('- Done processing all users jobs medicines.');
    res.send(true);
  } catch (err) {
    return nextError(next, err.message, 500, err.stack);
  }

};

const variablesExpand = (req, html, job, medicineId, user) => { // TODO: client/server duplicated code...
  // Variable tokens
  const variableTokens = {
    [req.t('[DOCTOR NAME]')]: (job) => job?.doctor?.name ?? '',
    [req.t('[PATIENT NAME]')]: (job) =>
      job?.patient?.firstName || job?.patient?.lastName ? `${job?.patient?.firstName} ${job?.patient?.lastName}` : '',
    [req.t('[MEDICINE NAME]')]: (job) => job?.medicines?.find(med => med.id === medicineId).name ?? '',
    [req.t('[USER NAME]')]: (_, user) =>
      user?.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '',
    [req.t('[USER EMAIL]')]: (_, user) => user?.email ?? '',
  };

  Object.entries(variableTokens).forEach((token) => {
    let replacement = variableTokens[token[0]](job, user);
    html = html.replaceAll(token[0], replacement);
  });
  return html;
};

module.exports = {
  runJobs,
};

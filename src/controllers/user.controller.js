const emailValidate = require("email-validator");
const codiceFiscaleValidate = require("codice-fiscale-js");
const { logger } = require("./logger.controller");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const Role = require("../models/role.model");
const RefreshToken = require("../models/refreshToken.model");
const { isObject, isArray, normalizeEmail, isAdministrator, nextError } = require("../helpers/misc");
const emailService = require("../services/email.service");
const { encryptData } = require("../helpers/encryption");
const config = require("../config");

const getAllUsersWithTokens = async (req, res, next) => {
  try {
    const [users, refreshTokens] = await Promise.all([
      User.find()
        .select(["-password", "-__v"])
        .populate("roles", "-__v")
        .populate("plan", "-__v")
        .lean(),
      RefreshToken.find({ // refresh tokens auto-expire, no need to check for expiration... just filter for user._id ...
        expiresAt: {
          $gte: new Date(),
        }
      })
        .select("token user expiresAt -_id")
        .lean()
        .exec()
    ]);
    users.map(user => {
      refreshTokens.map(refreshToken => {
        if (
          (String(refreshToken.user) === String(user._id)) &&
          (!user.refreshToken || user.refreshToken?.expiresAt < refreshToken?.expiresAt.toISOString())
        ) {
          user.refreshToken = {
            token: refreshToken.token,
            expiresAt: refreshToken.expiresAt
          };
        }
      });
    });

    return res.status(200).json({users});
  } catch (err) {
    return nextError(next, req.t("Error getting all users with full info: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

const getUsers = async (req, res, next) => {
  try {
    const filter = req.parameters.filter ?? {};
    if (typeof filter !== "object") {
      return res.status(400).json({ message: req.t("A filter must be an object") });
    }
    const users = await User.find(filter)
      .select(["-password", "-__v"])
      .populate("roles", "-__v")
      .populate("plan", "-__v")
      .lean()
      .exec()
    ;
    return res.status(200).json({users});
  } catch (err) {
    return nextError(next, req.t("Error getting all users: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

// get all plans
const getAllPlans = async (req, res, next) => {
  try {
    const docs = await Plan.find({})
      .select(["name", "supportTypes", "priceCurrency", "pricePerYear"])
      .sort({ pricePerYear: 1 })
    ;
    return res.status(200).json({ plans: docs });
  } catch (err) {
    //console.log("Error getting all plans:", err.message);
    return nextError(next, req.t("Error getting all plans: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

// get all roles
const getAllRoles = async (req, res, next) => {
  try {
    // the first element in the returned array is the "default" role
    const docs = await Role.find({})
      .select(["name", "priority"]) //, "-_id"])
    ;
    return res.status(200).json({ roles: docs });
  } catch (err) {
    return nextError(next, req.t("Error getting all roles: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

const getUser = async (req, res, next) => {
  let userId = req.parameters.userId ?? req.userId;
  // if (req.parameters.userId && req.parameters.userId !== userId) { // request to update another user's profile
  //   // this test should be done in routing middleware, but doing it here allows for a more specific error message
  //   if (!await isAdministrator(userId)) { // check if request is from admin
  //     return res.status(403).json({ message: req.t("You must have admin role to access another user") });
  //   } else {
  //     userId = req.parameters.userId; // if admin, accept a specific user id in request
  //   }
  // }
  // //if (!userId) rets.status(400).json({ message: req.t("User must be authenticated") });

  try {
    const user = await User.findOne({
      _id: userId
    })
      .populate("roles", "-__v")
      .populate("plan", "-__v")
    ;
    if (!user) {
      return res.status(400).json({ message: req.t("Could not find this user") });
    }
    res.status(200).json({ user });
  } catch (err) {
    return nextError(next, req.t("Error finding user: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

/**
 * Update current user's profile
 */
const updateUser = async (req, res, next) => {
  let userId = req.parameters.userId ?? req.userId;
  try {
    // collect update data
    const updateData = {};
    const { email, firstName, lastName, phone, fiscalCode, businessName, address, roles, plan, preferences } = req.parameters;
    const jobs = req.parameters.jobs; // TODO: move this to the previous line, jobs is a prop like another...

    if (email !== undefined) {
      const [message, value] = await propertyEmailValidate(req, email, userId);
      if (message) return res.status(400).json({ message });
      updateData.email = value;
    }
    if (firstName !== undefined) {
      const [message, value] = propertyFirstNameValidate(req, firstName);
      if (message) return res.status(400).json({ message });
      updateData.firstName = value;
    }
    if (lastName !== undefined) {
      const [message, value] = propertyLastNameValidate(req, lastName);
      if (message) return res.status(400).json({ message });
      updateData.lastName = value;
    }
    if (phone !== undefined) {
      const [message, value] = propertyPhoneValidate(req, phone);
      if (message) return res.status(400).json({ message });
      updateData.phone = value;
    }
    if (config.app.ui.useFiscalCode) {
      if (fiscalCode !== undefined) {
        const [message, value] = propertyFiscalCodeValidate(req, fiscalCode);
        if (message) return res.status(400).json({ message });
        updateData.fiscalCode = value;
      }
    }
    if (config.app.ui.useBusinessName) {
      if (businessName !== undefined) updateData.businessName = businessName;
    }
    if (config.app.ui.useAddress) {
      if (address) updateData.address = address;
    }

    // handle role updates with priority checks
    if (roles !== undefined && Array.isArray(roles) && roles.length > 0) {
      const user = await User.findById(userId).populate("roles"); //.session(session);
      if (!user) throw new Error(req.t("User not found"));
      const newRoles = await Role.find({ _id: { $in: roles } }); //.session(session);
      if (!(await isAdministrator(req.userId))) {
        const requestedRolesMaxPriority = Math.max(...newRoles.map(role => role.priority));
        const currentRolesMaxPriority = Math.max(...user.roles.map(role => role.priority));
        if (requestedRolesMaxPriority > currentRolesMaxPriority) {
          throw new Error(req.t("Sorry, it is not possible to elevate roles for users"));
        }
      }

      updateData.roles = newRoles.map(role => role._id); // put roles ids in updateData
    }

    // handle plan update
    if (plan !== undefined && typeof plan === "string" && plan.length > 0) {
      const user = await User.findById(userId).populate("plan");// .session(session);
      if (!user) throw new Error(req.t("User not found"));
      const newPlan = await Plan.find({ _id: { $in: plan } }); //.session(session);
      if (!(await isAdministrator(/*req.*/userId))) {
        if (newPlan !== user.plan) {
          return res.status(403).json({ message: req.t("You must have admin role to update a user's plan") });
        }
      }
      updateData.plan = newPlan._id; // put plan id in updateData
    }

    if (jobs !== undefined) { // jobs is encrypted object, no validation here
      updateData.jobs = jobs;
      // Object.keys(job).forEach(key => {
      //   updateData.job[key] = job[key];
      // });
    }
    
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }


    // update the user in a single transaction
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    )
      .populate("roles", "-__v")
      .populate("plan", "-__v")
    ;

    if (!updatedUser) {
      throw new Error(req.t("User not found"));
    }
    return res.status(200).json({ user: updatedUser });
  } catch (err) {
    logger.error("Error updating user:", err);
    if (err.codeName === "DuplicateKey") {
      if (err.keyValue.email) {
        return nextError(next, req.t("The email {{email}} is already in use", { email: err.keyValue.email }), 400);      
      }
    }
    return nextError(next, req.t("Error updating user: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

/**
 * Update current user's jobs data
 */
const updateUserJobsData = async (req, res, next) => {
  try {
    const userId = req.userId;
    const jobsData = req.parameters.jobsData;

    const result = await updateUserJobsDataInternal(userId, jobsData);

    if (result.error) {
      return res.status(result.status).json({
        error: true,
        message: req.t(result.message),
      });
    } else {
      return res.json({message: req.t("User job data updated successfully")});
    }
  } catch (err) {
    return nextError(next, req.t("Error updating user job data: {{err}}", { err: err.message }), 500, err.stack);
  }
};

/**
 * Update current user's jobs data (callable internally)
 */
const updateUserJobsDataInternal = async (userId, jobsData) => {
  if (!userId) {
    //return res.status(400).json({ error: true, message: 'Jobs data required' });
    return { error: true, status: 400, message: "User id is required" };
  }
  if (!jobsData) {
    //return res.status(400).json({ error: true, message: 'Jobs data required' });
    return { error: true, status: 400, message: "Jobs data is required" };
  }

  //try {
  const user = await User.findById(userId);

  // Generate key or retrieve from DB - TODO: move to login ...
  // let encryptionKey = user.encryptionKey;
  // if (!encryptionKey) {
  //   encryptionKey = generateNewEncryptionKey();
  //   user.encryptionKey = encryptionKey;
  // }

  if (!user.encryptionKey) {
    return { error: true, status: 403, message: "User encryption key not found" };
  }

  // In development mode, store unencrypted jobs data, to debug in an easier way
  if (config.mode.development) {
    user.jobsDataCLEAN = jobsData;
  }

  // Encrypt job with encryptionKey
  const encryptedJobsData = await encryptData(jobsData, user.encryptionKey);

  user.jobsData = encryptedJobsData;
  await user.save();

  //res.json({ success: true });
  return { success: true };
  // } catch (err) {
  //   //console.error('Failed to save job', err);
  //   //res.status(500).json({ error: true, message: 'Failed to save job' });
  //   //return nextError(next, req.t("Error updating user job: {{err}}", { err: err.message }), 500, err.stack);
  //   //return { error: true, status: 500, message: "Error updating user job: " + err.message };
  //   throw(err);
  // }
};

/*
const _updateRoles = async (req, userId) => {
  if (!userId) userId = req.userId;
  if (req.parameters.userId && req.parameters.userId !== userId) {
    if (!await isAdministrator(userId)) {
      throw new Error(req.t("You must have admin role to update another user's roles"));
    } else {
      userId = req.parameters.userId;
    }
  }
  
  if (req.parameters.roles === undefined || !Array.isArray(req.parameters.roles) || req.parameters.roles.length === 0) {
    throw new Error(req.t("Please specify at least one role"));
  }

  const user = await User.findOne({ _id: userId }).populate("roles", "-__v");
  if (!user) {
    throw new Error(req.t("User not found"));
  }

  const roles = await Role.find({ "_id": { $in: req.parameters.roles } });
  if (!await isAdministrator(req.userId)) {
    const requestedRolesMaxPriority = Math.max(...roles.map(role => role.priority));
    const currentRolesMaxPriority = Math.max(...user.roles.map(role => role.priority));
    if (requestedRolesMaxPriority > currentRolesMaxPriority) {
      const error = new Error(req.t("Sorry, it is not possible to elevate roles for users"));
      error.code = 403;
      throw error;
    }
  }

  user.roles = roles.map(role => role._id);
  await user.save();
  return roles;
};
*/

/*
const _updatePlan = async (req, userId) => {
  if (!userId) userId = req.userId;
  if (!await isAdministrator(userId)) {
    const error = new Error(req.t("Sorry, you must have admin role to update plans"));
    error.code = 403;
    throw error;
  } else {
    userId = req.parameters.userId;
  }

  if (!req.parameters.plan || !req.parameters.plan._id) {
    throw new Error(req.t("Plan is mandatory and must have a valid _id"));
  }

  try {
    const user = await User.findOne({ _id: userId }).populate("plan", "-__v");
    if (!user) {
      throw new Error(req.t("User not found"));
    }

    const plan = await Plan.findOne({ "_id": req.parameters.plan._id });
    if (!plan) {
      throw new Error(req.t("Plan not found"));
    }

    user.plan = plan._id;
    await user.save();

    return plan;
    //return { message: req.t("Plan updated") };
  } catch (err) {
    logger.error("Error in updatePlan:", err);
    throw err;
  }
};
*/

// promotes a user to "dealer" role
const promoteToDealer = async (req, res, next) => {
  const roleName = "dealer";
  const userId = req.parameters.userId;

  try {
    const user = await User.findOne({ _id: userId }).populate("roles", "-__v");
    if (!user) {
      throw new Error(req.t("No user by id {{userId}} found!", { userId }));
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      throw new Error(req.t("No role {{roleName}} found!", { roleName }));
    }

    if (!user.roles.some(r => r._id.toString() === role._id.toString())) {
      user.roles.push(role);
      await user.save();
      return res.status(200).json({ message: req.t("User has been promoted to role {{roleName}}", { roleName }), count: 1 });
    } else {
      return res.status(200).json({ message: req.t("User already had role {{roleName}}", { roleName }), count: 0 });
    }
  } catch (err) {
    return nextError(next, req.t("Error promoting user to {{role}}: {{err}}", { role: roleName, err: err.message }), 500, err.stack);      
  }
};

// deletes a user: delete it from database
const deleteUser = async (req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else {
    if (isObject(filter)) {
      // do nothing
    } else {
      if (isArray(filter)) {
        filter = { _id: { $in: filter } };
      } else {
        return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });
      }
    }
  }

  try {
    const data = await User.deleteMany(filter);
    if (data.deletedCount > 0) {
      return res.status(200).json({ message: req.t("{{count}} user(s) have been deleted", { count: data.deletedCount }), count: data.deletedCount });
    } else {
      return res.status(400).json({ message: req.t("No user have been deleted") });
    }
  } catch (err) {
    return nextError(next, req.t("Could not delete user(s) with filter {{filter}}: {{err}}", { filter: JSON.stringify(filter), err: err.message }), 500, err.stack);      
  }
};

// removes a user: mark it as deleted, but do not delete from database
const removeUser = async (req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else {
    if (isObject(filter)) {
      // do nothing
    } else {
      if (isArray(filter)) {
        filter = { _id: { $in: filter } };
      } else {
        return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });
      }
    }
  }
  
  const payload = { isDeleted: true };
  try {

    const data = await User.updateMany(filter, payload, { new: true, lean: true });
    if (data./*nModified*/modifiedCount > 0) {
      return res.status(200).json({ message: req.t("{{count}} user has been removed", { count: data./*nModified*/modifiedCount }), count: data./*nModified*/modifiedCount });
    } else {
      return res.status(400).json({ message: req.t("No user has been removed") });
    }
  } catch (err) {
    return nextError(next, req.t("Error finding user: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

// send an email to a list of users
const sendEmailToUsers = async (req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else {
    if (isObject(filter)) {
      // do nothing
    } else {
      if (isArray(filter)) {
        filter = { _id: { $in: filter } };
      } else {
        return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });
      }
    }
  }

  try {
    const users = await User.find(filter)
      .populate("roles", "-__v")
      .populate("plan", "-__v")
      .exec()
      ;
    if (!users || users.length === 0) {
      logger.warn(`No user found with filter ${filter}`);
      return res.status(400).json({ message: req.t("No user found with filter {{filter}}", { filter }) });
    }
      
    for (const user of users) {
      const to = user.email;
      const [subject, body] = expandEmailTags(user, req.parameters?.subject, req.parameters?.body);
      const style = "base"; // style is currently fixed
      try {
        req.language = user.language; // get user language
        await emailService.send(req, {
          to,
          subject,
          body,
          style,
        });
      } catch (err) {
        return nextError(next, req.t("Error sending email to users: {{err}}", { err: err.message }), 500, err.stack);      
      }
    }
    return res.status(200).json({ "message": req.t("All emails sent") });
  } catch (err) {
    return nextError(next, req.t("Error finding users: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

const expandEmailTags = (user, subject, body) => {
  const expand = (str) => {
    str = str.replace(/\$NAME\$/, user.firstName);
    str = str.replace(/\$SURNAME\$/, user.lastName);
    str = str.replace(/\$EMAIL\$/, user.email);
    str = str.replace(/\$PHONE\$/, user.phone);
    str = str.replace(/\$ADDRESS\$/, user.address);
    str = str.replace(/\$ROLES\$/, user.roles.map(role => role.name).join(", ")); // array of objects to csv string...
    str = str.replace(/\$PLAN\$/, user.plan.name);
    str = str.replace(/\$COMPANY\$/, user.company);
    return str;
  };
  subject = expand(subject);
  body = expand(body);
  return [subject, body];
};

// user properties validation
const propertyEmailValidate = async (req, email, userId) => { // validate and normalize email
  if (!emailValidate.validate(email)) {
    return [ req.t("Please supply a valid email"), email];
  }

  const normalizedEmail = normalizeEmail(email);

  // check if email exists but belongs to the same user
  const existingUser = await User.findOne({ email: normalizedEmail });
  //console.log("existingUser:", existingUser);
  if (existingUser && existingUser._id.toString() !== userId.toString()) {
    return [req.t("The email {{email}} is already in use", { email }), null];
  }
  
  // email is valid and either doesn't exist or belongs to this user
  return [null, normalizedEmail];
};

const propertyFirstNameValidate = (req, value/*, user*/) => { // validate and normalize first name
  value = value?.trim();
  if (!value) {
    return [ req.t("First name cannot be empty, sorry"), value ];
  }
  return [null, value];
};

const propertyLastNameValidate = (req, value/*, user*/) => { // validate and normalize last name
  value = value?.trim();
  if (!value) {
    return [ req.t("Last name cannot be empty, sorry"), value ];
  }
  return [null, value];
};

const propertyPhoneValidate = (req, value/*, user*/) => { // validate and normalize phone number (with int'l prefix)
  value = value?.trim();
  const valueNormalized = value.replace(/^\+/, '00');
  const digitsCount = valueNormalized.match(/\d/g).length;
  if (digitsCount < 9 || digitsCount > 15) {
    return [ req.t("Phone is not valid, sorry"), value ];
  }
  return [null, value];
};

const propertyFiscalCodeValidate = (req, value/*, user*/) => { // validate and normalize (italian) fiscal code
  value = value?.trim();
  if (!codiceFiscaleValidate.check(value)) {
    return [ req.t("Fiscal code is not valid, sorry"), value ];
  }
  return [null, value];
};


module.exports = {
  getUsers,
  getAllUsersWithTokens,
  getAllPlans,
  getAllRoles,
  getUser,
  updateUser, 
  updateUserJobsData,
  updateUserJobsDataInternal,
  //_updateRoles,
  //_updatePlan,
  promoteToDealer,
  deleteUser,
  removeUser,
  sendEmailToUsers,
};

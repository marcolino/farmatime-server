const emailValidate = require("email-validator");
const codiceFiscaleValidate = require("codice-fiscale-js");
const mongoose = require("mongoose");
//const i18n = require("i18next");
const { logger } = require("./logger.controller");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const Role = require("../models/role.model");
const RefreshToken = require("../models/refreshToken.model");
const { isObject, isArray, normalizeEmail, isAdministrator, arraysContainSameObjects } = require("../helpers/misc");
const emailService = require("../services/email.service");

const getAllUsersWithTokens = (req, res, next) => {
  // get all users and refresh tokens
  Promise.all([
    User.find()
    .select(["-password", "-__v"])
    .populate("roles", "-__v")
    .populate("plan", "-__v")
    .lean()
    .exec(),
    RefreshToken.find({ // refresh tokens auto-expire, no need to check for expiration... just filter for user._id ...
      expiresAt: {
        $gte: new Date(), 
      }
    })
    .select("token user expiresAt -_id")
    .lean()
    .exec()
  ]).then(([users, refreshTokens]) => {
    users.map(user => {
      refreshTokens.map(refreshToken => {
        if ((String(refreshToken.user) === String(user._id)) && (!user.refreshToken || user.refreshToken?.expiresAt < refreshToken?.expiresAt.toISOString())) {
          //user.refreshToken = (({ token, expiresAt }) => ({ token, expiresAt }))(refreshToken);
          user.refreshToken = {
            token: refreshToken.token,
            expiresAt: refreshToken.expiresAt
          };
        }
      });
    });

    return res.status(200).json({users});
  }).catch(err => {
    logger.error(`Error getting all users with full info: ${err.message}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  });
};

const getAllUsers = async(req, res, next) => {
  try {
    filter = req.parameters.filter ?? {};
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
  } catch(err) {
    logger.error(`Error getting all users: ${err.message}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  };
};

// get all plans
const getAllPlans = async(req, res, next) => {
  try {
    Plan.find({})
    .select(["name", "supportTypes", "priceCurrency", "pricePerYear"])
    .sort({pricePerYear: 1})
    .exec(async(err, docs) => {
      if (err) {
        logger.error(`Error getting plans: ${err}`);
        return next(Object.assign(new Error(err.message), { status: 500 }));
      }
      return res.status(200).json({ plans: docs });
    });
  } catch(err) {
    logger.error(`Error getting all plans: ${err.message}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

// get all roles
const getAllRoles = async(req, res, next) => {
  try {
    // the first element in the returned array is the "default" role
    Role.find({})
    .select(["name", "priority"]) //, "-_id"])
    .exec(async(err, docs) => {
      if (err) {
        logger.error(`Error getting roles: ${err}`);
        return next(Object.assign(new Error(err.message), { status: 500 }));
      }
      return res.status(200).json({ roles: docs });
    })
  } catch(err) {
    logger.error(`Error getting roles: ${err}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

const getUser = async(req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId && req.parameters.userId !== userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to access another user") });
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }
  //if (!userId) return res.status(400).json({ message: req.t("User must be authenticated") });

  User.findOne({
    _id: userId
  })
  .populate("roles", "-__v")
  .populate("plan", "-__v")
  .exec(async(err, user) => {
    if (err) {
      logger.error(`Error finding user: ${err}`);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (!user) {
      return res.status(400).json({ message: req.t("Could not find this user") });
    }
    res.status(200).json({user});
  });
};

/**
 * Update current user's profile
 */
const updateUser = async (req, res, next) => {
  // const session = await mongoose.startSession();
  // session.startTransaction();
  try {
    let userId = req.userId;
    if (req.parameters.userId && req.parameters.userId !== userId) {
      if (!(await isAdministrator(userId))) {
        return res.status(403).json({ message: req.t("You must have admin role to update another user") });
      }
      userId = req.parameters.userId;
    }

    // collect update data
    const updateData = {};
    const { email, firstName, lastName, phone, fiscalCode, businessName, address, roles, plan } = req.parameters;

    if (email) {
      const [message, value] = await propertyEmailValidate(req, email, userId);
      if (message) return res.status(400).json({ message });
      updateData.email = value;
    }
    if (firstName) {
      const [message, value] = propertyFirstNameValidate(req, firstName);
      if (message) return res.status(400).json({ message });
      updateData.firstName = value;
    }
    if (lastName) {
      const [message, value] = propertyLastNameValidate(req, lastName);
      if (message) return res.status(400).json({ message });
      updateData.lastName = value;
    }
    if (phone) {
      const [message, value] = propertyPhoneValidate(req, phone);
      if (message) return res.status(400).json({ message });
      updateData.phone = value;
    }
    if (fiscalCode) {
      const [message, value] = propertyFiscalCodeValidate(req, fiscalCode);
      if (message) return res.status(400).json({ message });
      updateData.fiscalCode = value;
    }
    if (businessName) updateData.businessName = businessName;
    if (address) updateData.address = address;

    // handle role updates with priority checks
    if (roles && Array.isArray(roles) && roles.length > 0) {
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
    if (plan && typeof plan === "string" && plan.length > 0) {
      const user = await User.findById(userId).populate("plan");// .session(session);
      if (!user) throw new Error(req.t("User not found"));
      const newPlan = await Plan.find({ _id: { $in: plan } }); //.session(session);
      if (!(await isAdministrator(req.userId))) {
        if (newPlan !== user.plan) {
          return res.status(403).json({ message: req.t("You must have admin role to update a user's plan") });
        }
      }
      updateData.plan = newPlan._id; // put plan id in updateData
    }

    // update the user in a single transaction
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true/*, session*/ }
    ).populate("roles", "-__v")
     .populate("plan", "-__v");

    if (!updatedUser) {
      throw new Error(req.t("User not found"));
    }

    // await session.commitTransaction();
    // session.endSession();

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    logger.error(`Error updating user: ${error.message}`);
    if (error.codeName === "DuplicateKey") {
      if (error.keyValue.email) {
        return next(Object.assign(new Error(req.t("The email {{email}} is already in use", { email: error.keyValue.email })), { status: 400 }));
      }
    }
    return next(Object.assign(new Error(error.message), { status: 500 }));
  }
};

const updateRoles = async(req, userId) => {
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

const updatePlan = async(req, userId) => {
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
  } catch (error) {
    logger.error(`Error in updatePlan: ${error}`);
    throw error;
  }
};

const promoteToDealer = async(req, res, next) => {
  //if (!userId) userId = req.userId;
  // if (req.parameters.userId && req.parameters.userId !== userId) {
  //   if (!await isAdministrator(userId)) {
  //     throw new Error(req.t("You must have admin role to update another user's roles"));
  //   } else {
  //     userId = req.parameters.userId;
  //   }
  // }
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
      return res.status(200).json({ message: req.t("user has been promoted to role {{roleName}}", { roleName }) });
    } else {
      return res.status(200).json({ message: req.t("user already had role {{roleName}}", { roleName }) });
    }
  } catch (err) {
    throw err;
  }
};

// deletes a user: delete it from database
const deleteUser = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else
  if (isObject(filter)) {
    ;
  } else
  if (isArray(filter)) {
    filter = { _id: { $in: filter } };
  } else
    return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });

  try {
    const data = await User.deleteMany(filter);
    if (data.deletedCount > 0) {
      return res.status(200).json({ message: req.t("{{count}} user(s) have been deleted", { count: data.deletedCount }), count: data.deletedCount });
    } else {
      return res.status(400).json({ message: req.t("No user have been deleted") });
    }
  } catch (err) {
    logger.error(`Could not delete user(s) with filter ${JSON.stringify(filter)}: ${err.messgae}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

// removes a user: mark it as deleted, but do not delete from database
const removeUser = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else
  if (isObject(filter)) {
    ;
  } else
  if (isArray(filter)) {
    filter = { _id: { $in: filter } };
  } else
    return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });

  const payload = { isDeleted: true };
  User.updateMany(filter, payload, {new: true, lean: true}, async(err, data) => {
    if (err) {
      logger.error(`Error finding user: ${err}`);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (data.nModified > 0) {
      return res.status(200).json({ message: req.t("{{count}} user(s) have been removed", { count: data.nModified }), count: data.nModified });
    } else {
      return res.status(400).json({ message: req.t("No user have been removed") });
    }
  });

};

// send an email to a list of users
const sendEmailToUsers = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL users!
    filter = {};
  } else
  if (isObject(filter)) {
    ;
  } else
  if (isArray(filter)) {
    filter = { _id: { $in: filter } };
  } else
    return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });

  let subject = req.parameters?.subject;
  let body = req.parameters?.body;

  User.find(filter)
  .populate("roles", "-__v")
  .populate("plan", "-__v")
  .exec(async(err, users) => {  
    if (err) {
      logger.error(`Error finding users: ${err}`);
      const ret = { message: req.t("Error finding users"), reason: err.message };
      return res ? res.status(err.code).json(ret) : ret;
    }
    if (!users || users.length === 0) {
      return res.status(400).json({ message: req.t("No user found with filter {{filter}}", { filter }) });
    }
    
    for (const user of users) {
      let to = user.email;

      const [subjectExpanded, bodyExpanded] = expandEmailTags(user, subject, body);
      try {
        req.language = user.language; // get user language
        await emailService.send(req, {
          to: user.email,
          subject: subjectExpanded,
          body: bodyExpanded,
          style: "base", // this is currently fixed
        });
      } catch (err) {
        logger.error(`Error sending email to users: ${err}`)
        return next(Object.assign(new Error(err.message), { status: 500 }));
      };
    }
    return res.status(200).json({ "message": req.t("All emails sent") });
  });
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
}

// user properties validation
const propertyEmailValidate = async(req, value, userId) => { // validate and normalize email
  if (!emailValidate.validate(value)) {
    return [ req.t("Please supply a valid email"), value];
  } 
  value = normalizeEmail(value);

  // be sure email - if changed - is not taken already
  const user = await User.findOne({ _id: userId });
  if (value !== normalizeEmail(user.email)) {
    const check = await User.findOne({ email: value });
    if (check) return [ req.t("This email is already taken, sorry"), value ];
  }
  return [null, value];
};

const propertyFirstNameValidate = (req, value, user) => { // validate and normalize first name
  value = value?.trim();
  if (!value) {
    return [ req.t("First name cannot be empty, sorry"), value ];
  }
  return [null, value];
};

const propertyLastNameValidate = (req, value, user) => { // validate and normalize last name
  value = value?.trim();
  if (!value) {
    return [ req.t("Last name cannot be empty, sorry"), value ];
  }
  return [null, value];
};

const propertyPhoneValidate = (req, value, user) => { // validate and normalize phone number
  value = value?.trim();
  if (!value.match(/\d/g).length === 10) {
    return [ req.t("Phone is not valid, sorry"), value ];
  }
  return [null, value];
};

const propertyFiscalCodeValidate = (req, value, user) => { // validate and normalize (italian) fiscal code
  value = value?.trim();
  if (!codiceFiscaleValidate.check(value)) {
    return [ req.t("Fiscal code is not valid, sorry"), value ];
  }
  return [null, value];
};


module.exports = {
  getAllUsers,
  getAllUsersWithTokens,
  getAllPlans,
  getAllRoles,
  getUser,
  updateUser, 
  updateRoles,
  updatePlan,
  promoteToDealer,
  deleteUser,
  removeUser,
  sendEmailToUsers,
};

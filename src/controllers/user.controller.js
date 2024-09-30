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

const getAllUsersWithFullInfo = (req, res, next) => {
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
          user.refreshToken = (({ token, expiresAt }) => ({ token, expiresAt }))(refreshToken);
        }
      });
    });

    return res.status(200).json({users});
  }).catch(err => {
    logger.error("Error getting all users with full info:", err.message);
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
    logger.error("Error getting all users with:", err.message);
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
        logger.error("Error getting plans:", err);
        return next(Object.assign(new Error(err.message), { status: 500 }));
      }
      return res.status(200).json({ plans: docs });
    });
  } catch(err) {
    logger.error("Error getting all plans:", err.message);
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
        logger.error("Error getting roles:", err);
        return next(Object.assign(new Error(err.message), { status: 500 }));
      }
      return res.status(200).json({ roles: docs });
    })
  } catch(err) {
    logger.error("Error getting roles:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

const getUser = async(req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId && req.parameters.userId !== userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to update another user") }); // TODO: wrong message...
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
      logger.error("Error finding user:", err);
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
  let userId = req.userId;
  if (req.parameters.userId && req.parameters.userId !== userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to update another user") });
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }

  User.findOne({
    _id: userId
  })
  .populate({ path: "roles", select: "-__v", options: { lean: true }})
  .populate({ path: "plan", select: "-__v", options: { lean: true }})
  .exec(async(err, user) => {
    if (err) {
      logger.error("Error finding user:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (!user) {
      return res.status(400).json({ message: req.t("User not found") });
    }

    // validate and normalize email
    let [message, value] = [null, null];

    if ((req.parameters.email !== undefined)) { //&& (req.parameters.email !== user.email)) { // TO-DO (?): for all updates, skip update check and update if value did not change
      [message, value] = await propertyEmailValidate(req, req.parameters.email, user);
      if (message) return res.status(400).json({ message });
      user.email = value;
    }

    if (req.parameters.firstName !== undefined) {
      [message, value] = user.firstName = propertyFirstNameValidate(req, req.parameters.firstName, user);
      if (message) return res.status(400).json({ message });
      user.firstName = value;
    }

    if (req.parameters.lastName !== undefined) {
      [message, value] = user.lastName = propertyLastNameValidate(req, req.parameters.lastName, user);
      if (message) return res.status(400).json({ message });
      user.lastName = value;
    }

    if (req.parameters.phone !== undefined) {
      [message, value] = user.phone = propertyPhoneValidate(req, req.parameters.phone, user);
      if (message) return res.status(400).json({ message });
      user.phone = value;
    }

    if (req.parameters.fiscalCode !== undefined) {
      [message, value] = user.fiscalCode = propertyFiscalCodeValidate(req, req.parameters.fiscalCode, user);
      if (message) return res.status(400).json({ message });
      user.fiscalCode = value;
    }

    if (req.parameters.businessName !== undefined) {
      user.businessName = req.parameters.businessName;
    }

    if (req.parameters.address !== undefined) {
      user.address = req.parameters.address;
    }

    user.save(async (err, user) => {
      if (err) {
        return res.status(err.code).json({ message: err.message });
      }
  
      try {
        // update roles, if needed
        if (req.parameters?.roles && !arraysContainSameObjects(req.parameters.roles, user.roles, "_id")) {
          await updateRoles(req, userId);
        }
        
        // update plan, if needed
        if (req.parameters?.plan && !(String(req.parameters.plan._id) === String(user.plan?._id))) {
          await updatePlan(req, userId);
        }
  
        return res.status(200).json({ user });
      } catch (error) {
        logger.error("Error updating roles or plan:", error.message);
        return next(Object.assign(new Error(error.message), { status: 403 }));
      }
    });
      
  });
}

const updateRoles = async (req, userId) => {
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
      //throw new Error();
      const error = new Error(req.t("Sorry, it is not possible to elevate roles for users"));
      error.code = 403;
      throw error;
    }
  }

  user.roles = roles.map(role => role._id);
  await user.save();
  return { message: req.t("Roles updated") };
};

const updatePlan = async (req, userId) => {
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

    return { message: req.t("Plan updated") };
  } catch (error) {
    logger.error("Error in updatePlan:", error);
    throw error;
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
const removeUser = async (req, res, next) => {
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
      logger.error("Error finding user:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (data.nModified > 0) {
      return res.status(200).json({ message: req.t("{{count}} user(s) have been deleted", { count: data.nModified }), count: data.nModified });
    } else {
      return res.status(400).json({ message: req.t("No user have been deleted") });
    }
  });

};

// send an email to a list of users
const sendEmailToUsers = async (req, res, next) => {
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
  //.populate("roles", "-__v")
  //.populate("plan", "-__v")
  .exec(async(err, users) => {  
    if (err) {
      logger.error("Error finding users:", err);
      const ret = { message: req.t("Error finding users"), reason: err.message };
      return res ? res.status(err.code).json(ret) : ret;
    }
    if (!users || users.length === 0) {
      return res.status(400).json({ message: req.t("No user found with filter {{filter}}", { filter }) });
    }
    
    for (const user of users) {
      let to = user.email;
      try {
        req.language = user.language; // get user language
        await emailService.send(req, {
          to: user.email,
          subject,
          body,
          style: "base", // this is currently fixed
        });
      } catch (err) {
        logger.error("Error sending email to users:", err)
        return next(Object.assign(new Error(err.message), { status: 500 }));
      };
    }
    return res.status(200).json({ "message": req.t("All emails sent") });
  });
};

// user properties validation
const propertyEmailValidate = async(req, value, user) => { // validate and normalize email
  if (!emailValidate.validate(value)) {
    return [ req.t("Please supply a valid email"), value];
  } 
  value = normalizeEmail(value);

  // be sure email - if changed - is not taken already
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
  getAllUsersWithFullInfo,
  getAllPlans,
  getAllRoles,
  getUser,
  updateUser, 
  updateRoles,
  updatePlan,
  deleteUser,
  removeUser,
  sendEmailToUsers,
};

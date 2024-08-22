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

    res.status(200).json({users});
  }).catch(err => {
    logger.error("Error getting all users with full info:", err.message);
    //return res.status(500).json({ message: err.message });
    const error = new Error(err.message);
    error.status = 500;
    next(error);
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
    res.status(200).json({users});
  } catch(err) {
    logger.error("Error getting all users with:", err.message);
    //return res.status(500).json({ message: err.message });
    const error = new Error(err.message);
    error.status = 500;
    next(error);
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
        //return res.status(err.code).json({ message: req.t("Could not get plans"), reason: err.message });
        const error = new Error(err.message);
        error.status = 500;
        next(error);
      }
      res.status(200).json({ plans: docs });
    });
  } catch(err) {
    logger.error("Error getting all plans:", err.message);
    res.status(500).json({ message: req.t("Error getting all plans"), reason: err.message });
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
        //return res.status(err.code).json({ message: req.t("Could not get roles"), reason: err.message });
        const error = new Error(err.message);
        error.status = 500;
        next(error);
      }
      res.status(200).json({ roles: docs });
    })
  } catch(err) {
    logger.error("Error getting roles:", err);
    res.status(500).json({ message: req.t("Error getting roles"), reason: err.message });
  }
};

const getUser = async(req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to update another user"), code: "MustBeAdmin", reason: req.t("Admin role required") });
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
      //return res.status(err.code).json({ message: req.t("Could not find user"), reason: err.message });
      const error = new Error(err.message);
      error.status = 500;
      next(error);
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
  if (req.parameters.userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to update another user"), code: "MustBeAdmin", reason: req.t("Admin role required") });
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }
  //if (!userId) return res.status(400).json({ message: req.t("User must be authenticated") });

  User.findOne({
    _id: userId
  })
  .populate({ path: "roles", select: "-__v", options: { lean: true }})
  .populate({ path: "plan", select: "-__v", options: { lean: true }})
  .exec(async(err, user) => {
  //User.findOne({ _id: userId }, async(err, user) => {
    if (err) {
      logger.error("Error finding user:", err);
      //return res.status(err.code).json({ message: req.t("Error looking for user"), reason: err.message });
      const error = new Error(err.message);
      error.status = 500;
      next(error);
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

    // verify and save the user
    user.save(async(err, user) => {
      if (err) {
        return res.status(err.code).json({ message: err.message });
      }

      // update roles, if needed
      if (req.parameters?.roles && !arraysContainSameObjects(req.parameters.roles, user.roles, "_id")) {
        const err = await updateRoles(req, null);
        if (err) {
          //return res.status(err.code).json({ message: err.message });
          const error = new Error(err.message);
          error.status = 500;
          next(error);
        }
      }
      
      // update plan, if needed
      if (req.parameters?.plan && !(String(req.parameters.plan._id) === String(user.plan?._id))) {
        const err = await updatePlan(req, null);
        if (err) {
          //return res.status(err.code).json({ message: err.message });
          const error = new Error(err.message);
          error.status = 500;
          next(error);
        }
      }

      res.status(200).json({ user });
    });
      
  });
}
 
const updateRoles = async(req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      const ret = { message: req.t("You must have admin role to update another user"), code: "MustBeAdmin", reason: req.t("Admin role required") };
      return res ? res.status(403).json(ret) : ret; 
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }
  //if (!userId) return res.status(400).json({ message: req.t("User must be authenticated") });

  if (req.parameters.roles === undefined || typeof req.parameters.roles !== "object" || req.parameters.roles.length <= 0) {
    const ret = { message: req.t("Please specify at least one role") };
    return res ? res.status(400).json(ret) : ret; 
  }

  User.findOne({ _id: userId })
  .populate("roles", "-__v")
  .exec(async(err, user) => {  
    if (err) {
      logger.error("Error finding user:", err);
      const ret = { message: req.t("Error looking for user"), reason: err.message };
      return res ? res.status(err.code).json(ret) : ret; 
    }
    if (!user) {
      const ret = { message: req.t("User not found") };
      return res ? res.status(400).json(ret) : ret; 
    }

    // get roles ids, here we only have the names...
    Role.find({
      "_id": { $in: req.parameters.roles }
    }, async(err, docs) => {
      if (err) {
        logger.error("Error finding roles:", err);
        const ret = { message: req.t("Sorry, this user is not allowed elevate roles") };
          return res ? res.status(403).json(ret) : ret;
      }

      if (!await isAdministrator(req.userId)) { // caller is not admin: check if requested roles do not require an upgrade, otherwise error out
        requestedRolesMaxPriority = Math.max(...docs.map(role => role.priority));
        currentRolesMaxPriority = Math.max(...user.roles.map(role => role.priority));
        if (requestedRolesMaxPriority > currentRolesMaxPriority) {
          const ret = { message: req.t("Sorry, this user is not allowed elevate roles") };
          return res ? res.status(403).json(ret) : ret;
        }
      }
      user.roles = docs.map(doc => doc._id);

      // verify and save the user
      user.save(err => {
        if (err) {
          logger.error("Error saving user:", err);
          // const ret = { message: "Error saving user", reason: err.message };
          // return res ? res.status(err.code).json(ret) : ret;
          const error = new Error(err.message);
          error.status = 500;
          next(error);
        }
        const ret = { message: req.t("The roles have been updated") };
        return res ? res.status(200).json(ret) : null; 
      });
    });
  });
}
  
const updatePlan = async(req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId) { // request to update another user's profile
    if (!await isAdministrator(userId)) { // check if request is from admin
      const ret = { message: req.t("You must have admin role to update another user"), code: "MustBeAdmin", reason: req.t("Admin role required") };
      return res ? res.status(403).json(ret) : ret;
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }
  //if (!userId) return res.status(400).json({ message: req.t("User must be authenticated") });

  if (!req.parameters.plan) return res.status(400).json({ message: req.t("Plan is mandatory") });
  if (!req.parameters.plan._id) return res.status(400).json({ message: req.t("Plan is wrong") });

  User.findOne({ _id: userId })
  .populate("plan", "-__v")
  .exec(async(err, user) => {  
    if (err) {
      logger.error("Error finding user:", err);
      const ret = { message: req.t("Error looking for user"), reason: err.message };
      return res ? res.status(err.code).json(ret) : ret;
    }
    if (!user) {
      return res.status(400).json({ message: req.t("User not found") });
    }

    // search plan
    Plan.findOne({
      "_id": req.parameters.plan._id
    }, async(err, doc) => {
      if (err) {
        logger.error("Error finding plan:", err);
        const ret = { message: "Error finding plan", reason: err.message };
        return res ? res.status(err.code).json(ret) : ret;
      }

      // if (!await isAdministrator(req.userId)) { // caller is not admin: check if requested plan do not require an upgrade, otherwise error out
      //   if (doc.cigNumberAllowed > user.plan.cigNumberAllowed) { // we assume cigNumberAllowed is a measure of plan priority
      //     const ret = { message: req.t("Sorry, this user is not allowed elevate plan") };
      //     return res ? res.status(403).json(ret) : ret;
      //   }
      // }
      user.plan = doc._id;

      // verify and save the user
      user.save(err => {
        if (err) {
          logger.error("Error saving user:", err);
          // const ret = { message: "Error saving user", reason: err.message };
          // return res ? res.status(err.code).json(ret) : ret;
          const error = new Error(err.message);
          error.status = 500;
          next(error);
        }
        const ret = { message: req.t("The plan has been updated"), user };
        return res ? res.status(200).json(ret) : null;
      });
    });
  });
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
    return res.status(400).json({ "message": req.t("filter must be specified and be '*' or a filter object or an array of ids") });

  try {
    const data = await User.deleteMany(filter);
    if (data.deletedCount > 0) {
      res.status(200).json({ message: req.t("{{count}} user(s) have been deleted", { count: data.deletedCount }), count: data.deletedCount });
    } else {
      res.status(400).json({ message: req.t("No user have been deleted") });
    }
  } catch (err) {
    logger.error(`Could not delete user(s) with filter ${JSON.stringify(filter)}: ${err.messgae}`);
    //res.status(err.code).json({ message: req.t("Could not delete user(s)"), reason: err.message });
    const error = new Error(err.message);
    error.status = 500;
    next(error);
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
    return res.status(400).json({ "message": req.t("filter must be specified and be '*' or a filter object or an array of ids") });

  const payload = { isDeleted: true };
  //let ids = ["66aca5ebca51977b636aa225"];
  //filter = { _id: { $in: ids } }
  User.updateMany(filter, payload, {new: true, lean: true}, async(err, data) => {
    if (err) {
      logger.error("Error finding user:", err);
      //return res.status(err.code).json({ message: req.t("Error looking for user"), reason: err.message });
      const error = new Error(err.message);
      error.status = 500;
      next(error);
    }
    if (data.nModified > 0) {
      res.status(200).json({ message: req.t("{{count}} user(s) have been deleted", { count: data.nModified }), count: data.nModified });
    } else {
      res.status(400).json({ message: req.t("No user have been deleted") });
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
    return res.status(400).json({ "message": req.t("filter must be specified and be '*' or a filter object or an array of ids") });

  let subject = req.parameters?.subject;
  let body = req.parameters?.body;

  User.find(filter)
  //.populate("roles", "-__v")
  //.populate("plan", "-__v")
  .exec(async(err, users) => {  
    if (err) {
      logger.error("Error finding users:", err);
      const ret = { message: req.t("Error looking for users"), reason: err.message };
      return res ? res.status(err.code).json(ret) : ret;
    }
    if (!users || users.length === 0) {
      return res.status(400).json({ message: req.t("No user found with filter {{filter}}", { filter }) });
    }
    
    for (const user of users) {
      let to = user.email;
      try {
        //req.language = user.language; // TODO: get user language (when it ill be available)
        await emailService.send(req, {
          to: [ user.email ],
          subject,
          body,
          style: "base", // this is currently fixed
        });
      } catch (err) {
        const error = new Error(err.message);
        error.status = 500;
        next(error);
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

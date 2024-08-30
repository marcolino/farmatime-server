const mongoose = require("mongoose");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
const { logger } = require("../controllers/logger.controller");
require("dotenv").config({path: "../.env.dev"});
const config = require("../config");


const db = {
  users: [
    {
      email: config.defaultUsers.admin.email,
      password: config.defaultUsers.admin.password,
      firstName: config.defaultUsers.admin.firstName,
      lastName: config.defaultUsers.admin.lastName,
      isVerified: true,
      justRegistered: false,
    },
  ],
  roles: config.roles,
  plans: config.plans,
};

const populate = () => { // first time populate static reference documents

  User.estimatedDocumentCount((err, count) => {
    if (err) {
      logger.error("Error estimating users documents count:", err);
      throw(err);
    }
    if (count === 0) { // roles is empty
      db.users.map(user => {
        new User(user).save(err => {
          if (err) {
            logger.error("Error saving user:", err);
            throw(err);
          }
          logger.info(`added user ${user.firstName} ${user.lastName} to users collection`);
        });
      });
    }
  });
  
  Role.estimatedDocumentCount((err, count) => {
    if (err) {
      logger.error("Error estimating roles documents count:", err);
      throw(err);
    }
    if (count === 0) { // roles is empty
      let rolesSaved = 0;
      db.roles.forEach(role => {
        new Role(role).save(err => {
          if (err) {
            logger.error(`error saving role ${role}:`, err);
            throw (err);
          }
          logger.info(`added role ${role.name} to roles collection`);
          rolesSaved++;

          if (rolesSaved === db.roles.length) {
            logger.info("all roles have been saved");
            addRoleToUser("admin", config.defaultUsers.admin.email);
          }
        });
      });

    }
  });

  Plan.estimatedDocumentCount((err, count) => {
    if (err) {
      logger.error("Error estimating plans documents count:", err);
      throw(err);
    }
    if (count === 0) { // plans is empty
      let plansSaved = 0;
      db.plans.map(plan => {
        new Plan(
          plan
        ).save(err => {
          if (err) {
            logger.error(`Error saving plan ${plan.name}:`, err);
            throw(err);
          }
          plansSaved++;

          if (plansSaved === db.plans.length) {
            logger.info("all plans have been saved");
            addPlanToUser("unlimited", config.defaultUsers.admin.email);
          }
        });
      });
    }
  });
};

// add admin role to admin user
const addRoleToUser = (roleName, userEmail) => {
  Role.findOne({ name: roleName }).exec((err, role) => {
    if (err) {
      logger.error(`error finding role "${roleName}":`, err);
      throw (err);
    }
    User.findOne({ email: config.defaultUsers.admin.email }).exec((err, user) => {
      if (err) {
        logger.error(`error finding "${userEmail}" user:`, err);
        throw (err);
      }
      user.roles.push(role._id);
      user.save(err => {
        if (err) {
          logger.error(`error adding "${roleName}" role to "${userEmail}" user:`, err);
          throw (err);
        }
        logger.info(`added "${roleName}" role to "${userEmail}" user`);
      });
    });
  });
}

// add top plan to admin user
const addPlanToUser = (planName, userEmail) => {
  Plan.findOne({ name: planName }).exec((err, plan) => {
    if (err) {
      logger.error(`error finding plan "${planName}":`, err);
      throw (err);
    }
    User.findOne({ email: config.defaultUsers.admin.email }).exec((err, user) => {
      if (err) {
        logger.error(`error finding "${userEmail}" user:`, err);
        throw (err);
      }
      user.plan = plan;
      user.save(err => {
        if (err) {
          logger.error(`error adding "${planName}" plan to "${userEmail}" user:`, err);
          throw (err);
        }
        logger.info(`added "${planName}" plan to "${userEmail}" user`);
      });
    });
  });
}

module.exports = {
  mongoose,
  populate,
};
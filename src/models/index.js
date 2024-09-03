const mongoose = require("mongoose");
const db = require("../models");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
const { logger } = require("../controllers/logger.controller");
require("dotenv").config({path: "../.env.dev"});
const config = require("../config");


const dbMock = {
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


const connect = async () => {
  // set up database connection uri
  const connUri =
    config.mode.production ?
      // production db uri
      `${process.env.MONGO_SCHEME}://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB}` :
      config.mode.test ?
        // test db uri
        `${process.env.MONGO_SCHEME}://${process.env.MONGO_URL}/${process.env.MONGO_DB_TEST}`
        :
        // development db uri
        `${process.env.MONGO_SCHEME}://${process.env.MONGO_URL}/${process.env.MONGO_DB}`
    ;
  
  try {
    await mongoose.connect(connUri, {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    logger.info("Database connected");
    try {
      await populate() // populate database with initial contents if first time
      //logger.info("Database populated");
    } catch (err) {
      //logger.error("Database populate error:", err.message);
      throw err;
    }
  } catch (err) {
    throw err;
  }
};

/**
 * first time populate static reference documents
 */
const populate = async () => {
  try {
    // check if users collection is empty
    const userCount = await User.estimatedDocumentCount();
    if (userCount === 0) {
      await Promise.all(dbMock.users.map(async (user) => {
        await new User(user).save();
        logger.info(`added user ${user.firstName} ${user.lastName} to users collection`);
      }));
    }

    // check if roles collection is empty
    const roleCount = await Role.estimatedDocumentCount();
    if (roleCount === 0) {
      await Promise.all(dbMock.roles.map(async (role) => {
        await new Role(role).save();
        logger.info(`added role ${role.name} to roles collection`);
      }));
      await addRoleToUser("admin", config.defaultUsers.admin.email);
    }

    // check if plans collection is empty
    const planCount = await Plan.estimatedDocumentCount();
    if (planCount === 0) {
      await Promise.all(dbMock.plans.map(async (plan) => {
        await new Plan(plan).save();
      }));
      logger.info("all plans have been saved");
      await addPlanToUser("unlimited", config.defaultUsers.admin.email);
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/**
 * first time populate static reference documents
 */
const populateCHATGPT = () => {
  return new Promise((resolve, reject) => {
    User.estimatedDocumentCount((err, count) => {
      if (err) {
        logger.error("Error estimating users documents count:", err);
        return reject(err); // reject the promise if there is an error
      }

      if (count === 0) { // user collection is empty
        const allPromises = dbMock.users.map(user => {
          return new Promise((resolve, reject) => {
            new User(user).save(err => {
              if (err) {
                logger.error("Error saving user:", err);
                return reject(err);
              }
              logger.info(`added user ${user.firstName} ${user.lastName} to users collection`);
              resolve();
            });
          });
        });

        // wait for all save operations to complete
        Promise.all(allPromises)
          .then(resolve)
          .catch(reject);
      } else {
        // if users collection is not empty, resolve immediately
        resolve();
      }
    });
  });
};


const populate_ORIG = () => { // first time populate static reference documents
  User.estimatedDocumentCount((err, count) => {
    if (err) {
      logger.error("Error estimating users documents count:", err);
      throw(err);
    }
    if (count === 0) { // roles is empty
      dbMock.users.map(user => {
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
      dbMock.roles.forEach(role => {
        new Role(role).save(err => {
          if (err) {
            logger.error(`error saving role ${role}:`, err);
            throw (err);
          }
          logger.info(`added role ${role.name} to roles collection`);
          rolesSaved++;

          if (rolesSaved === dbMock.roles.length) {
            logger.info("all roles have been saved");
            addRoleToUser("admin", config.defaultUsers.admin.email);
          }
        });
      });

    }
  });

  Plan.estimatedDocumentCount((err, count) => {
    if (err) {
      logger.error("error estimating plans documents count:", err);
      throw(err);
    }
    if (count === 0) { // plans is empty
      let plansSaved = 0;
      dbMock.plans.map(plan => {
        new Plan(
          plan
        ).save(err => {
          if (err) {
            logger.error(`error saving plan ${plan.name}:`, err);
            throw(err);
          }
          plansSaved++;

          if (plansSaved === dbMock.plans.length) {
            logger.info("all plans have been saved");
            addPlanToUser("unlimited", config.defaultUsers.admin.email);
          }
        });
      });
    }
  });
};

// add admin role to admin user
const addRoleToUser = async(roleName, userEmail) => {
  try {
    // find the role by its name
    const role = await Role.findOne({ name: roleName }).exec();
    if (!role) {
      throw new Error(`role "${roleName}" not found`);
    }

    // find the user by their email
    const user = await User.findOne({ email: userEmail }).exec();
    if (!user) {
      throw new Error(`user with email "${userEmail}" not found`);
    }

    // add the role to the user's roles array
    user.roles.push(role._id);

    // save the updated user
    await user.save();

    logger.info(`added "${roleName}" role to "${userEmail}" user`);
  } catch (err) {
    logger.error(`error adding "${roleName}" role to "${userEmail}" user:`, err);
    throw err; // rethrow the error for further handling if needed
  }
};

// add top plan to admin user
const addPlanToUser = async (planName, userEmail) => {
  try {
    // find the plan by its name
    const plan = await Plan.findOne({ name: planName }).exec();
    if (!plan) {
      throw new Error(`plan "${planName}" not found`);
    }

    // find the user by their email
    const user = await User.findOne({ email: userEmail }).exec();
    if (!user) {
      throw new Error(`user with email "${userEmail}" not found`);
    }

    // assign the plan to the user
    user.plan = plan;

    // save the updated user
    await user.save();

    logger.info(`added "${planName}" plan to "${userEmail}" user`);
  } catch (err) {
    logger.error(`error adding "${planName}" plan to "${userEmail}" user:`, err);
    throw err; // Rethrow the error for further handling if needed
  }
};

// add admin role to admin user
const addRoleToUser_NO_PROMISES = (roleName, userEmail) => {
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
const addPlanToUser_NO_PROMISES = (planName, userEmail) => {
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
  //mongoose,
  connect,
  populate,
};
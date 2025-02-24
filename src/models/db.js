const mongoose = require("mongoose");
const Env = require("./env.model.js");
const User = require("./user.model.js");
const Role = require("./role.model.js");
const Plan = require("./plan.model.js");
const Product = require("./product.model.js");
const { logger } = require("../controllers/logger.controller.js");
const demoData = require("../../data/demo.js");
const config = require("../config.js");


const connect = async () => {
  // set up database connection uri
  const connUri = (
    config.mode.production || config.mode.staging) ? // production/staging db uri
    `${process.env.MONGO_SCHEME}://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB}` :
      config.mode.development ? // development db uri
        `${process.env.MONGO_DEV_LOCAL_SCHEME}://${process.env.MONGO_DEV_LOCAL_URL}/${process.env.MONGO_DEV_LOCAL_DB}` :
        config.mode.testgithubactions ? // test in github actions db uri
          `${process.env.MONGO_TEST_REMOTE_SCHEME}://${process.env.MONGO_TEST_REMOTE_USER}:${process.env.MONGO_TEST_REMOTE_PASS}@${process.env.MONGO_TEST_REMOTE_URL}/${process.env.MONGO_TEST_REMOTE_DB}` :
          config.mode.test ? // test db uri
            `${process.env.MONGO_TEST_LOCAL_SCHEME}://${process.env.MONGO_TEST_LOCAL_URL}/${process.env.MONGO_TEST_LOCAL_DB}` :
            null
  ;
  if (!connUri) {
    const err = `Unforeseen mode ${JSON.stringify(config.mode)}, cannot connect database`;
    logger.error(err);
    throw new Error(err);
  }

  try {
    logger.info("Connecting to database uri:", connUri.replace(`:${process.env.MONGO_PASS}`, ":***"));
    await mongoose.connect(connUri);
    logger.info("Database connected");

    mongoose.set("debug", config.db.debug);

    // show MongoDB version
    try {
      const admin = new mongoose.mongo.Admin(mongoose.connection.db);
      const info = await admin.buildInfo();
      logger.info(`MongoDB v${info.version}`);
    } catch (err) {
      logger.error("MongoDB build info error:", err);
    }
  } catch (err) {
    logger.error("Database connection error:", err);
    throw err;
  }
};

/**
 * first time populate static reference documents
 */
const populate = async () => {
  try {
    if (config.mode.test) { // drop and populate database in test mode
      await mongoose.connection.db.dropDatabase();
    }

    // check if env collection is empty
    try {
      const envCount = await Env.estimatedDocumentCount();
      if (envCount === 0) {
        for (const data of demoData.envs) {
          try {
            await Env.create(data);
          } catch (err) {
            logger.error("error creating Env:", err);
            throw err;
          }
        }
      }
    } catch (err) {
      logger.error("Error populating envs collection:", err.message);
      throw err;
    }

    // check if users collection is empty
    try {
      const userCount = await User.estimatedDocumentCount();
      if (userCount === 0) {
        for (const data of demoData.users) {
          await User.create(data);
        }
      }
    } catch (err) {
      logger.error("Error populating users collection:", err.message);
      throw err;
    }

    // check if roles collection is empty
    try {
      const roleCount = await Role.estimatedDocumentCount();
      if (roleCount === 0) {
        for (const data of demoData.roles) {
          await Role.create(data);
        }
        await addRoleToUser("admin", demoData.default.adminUser.email);
      }
    } catch (err) {
      logger.error("Error populating roles collection:", err.message);
      throw err;
    }

    // check if plans collection is empty
    try {
      const planCount = await Plan.estimatedDocumentCount();
      if (planCount === 0) {
        for (const data of demoData.plans) {
          await Plan.create(data);
        }
        await addPlanToUser("unlimited", demoData.default.adminUser.email);
      }
    } catch (err) {
      logger.error("Error populating plans collection:", err.message);
      throw err;
    }

    // check if products collection is empty
    try {
      const productCount = await Product.estimatedDocumentCount();
      if (productCount === 0) {
        for (const data of demoData.products) {
          await Product.create(data);
        }
        // TODO: add product images...
      }
    } catch (err) {
      logger.error("Error populating products collection:", err.message);
      throw err;
    }
  } catch (err) {
    logger.log("Error in populate:", err.message);
    throw err;
  }
};

// add admin role to admin user
const addRoleToUser = async (roleName, userEmail) => {
  try {
    // find the role by its name
    const role = await Role.findOne({ name: roleName }).exec();
    if (!role) {
      throw new Error(`role "${roleName}" not found`);
    }

    // find the user by their email
    const user = await User.findOne({ email: userEmail }); //.exec();
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
    throw err;
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
    throw err;
  }
};

const initializeDatabase = () => {
  return (async () => {
    try {
      if (!mongoose.connection.db) await connect();
      await populate();
    } catch (err) {
      logger.error("Error during database connection:", err);
      throw err;
    }
  })(); // run this async function now, but register it's returned promise end export it, so users can wait for it to resolve (and db be really ready)
};

let initializeDatabasePromise = initializeDatabase();

const resetDatabase = () => {
  initializeDatabasePromise = initializeDatabase();
  return initializeDatabasePromise;
};

module.exports = {
  initializeDatabase: initializeDatabasePromise,
  resetDatabase,
};

const mongoose = require("mongoose");
const Env = require("../models/env.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
const Product = require("../models/product.model");
const { logger } = require("../controllers/logger.controller");
require("dotenv").config({path: "../.env.dev"});
const config = require("../config");


const dbMock = {
  env: [
    { key: "MAINTENANCE", value: false },
  ],
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
  products: [
    {
      mdaCode: "0332",
      oemCode: "oem-booh-1",
      make: "FIAT",
      models: [ "TEMPRA 1.6ie (88-)", "TIPO 1.4ie-digit (87-95)", "TIPO 1.6 dgt-selecta (87-95)" ],
      application: "application-booh-1",
      kw: 1.7,
      volt: 12,
      ampere: 300,
      teeth: 10,
      rotation: "destra",
      regulator: "incorporato",
      notes: "E' un bel motorino",
      type: "motorino",
      price: 99.99,
      imageNameOriginal: "332.jpg",
    },
    {
      mdaCode: "0334",
      oemCode: "oem-booh-2",
      make: "FIAT",
      models: [ "REGATA 1.7 D (83-)", "RITMO 1.7 D (79-)", "TIPO 1.7 D (87-)" ],
      application: "application-booh-2",
      kw: 1.60,
      volt: 12,
      ampere: "",
      teeth: 910,
      rotation: "sinistra",
      regulator: "esterno",
      notes: "",
      type: "motorino",
      price: 88.88,
      imageNameOriginal: "334_0.jpg",
    },
    {
      mdaCode: "2702",
      oemCode: "oem-booh-3",
      make: "FIAT",
      models: [ "BRAVA 1.2i 16V (98-)", "PUNTO 85 16V-cabrio (97-)" ],
      application: "application-booh-3",
      kw: 1.60,
      volt: 12,
      ampere: 65,
      teeth: 30,
      rotation: "destra",
      regulator: "incorporato",
      notes: "PULEGGIA MULTIRIGHE - AUTOVENTILATO",
      type: "alternatore",
      price: 77.77,
      imageNameOriginal: "2702.jpg",
    },
    {
      mdaCode: "979",
      oemCode: "oem-booh-",
      make: "FIAT",
      models: [ "500 X 2.0 multijet 4X4 (5526308…) 11.14-", "DOBLÓ 2.0 multijet (263A1.000) 02.10-", "DUCATO 2.0 multijet [115] (250A1.000) 06.11-06.16" ],
      application: "application-booh-4",
      kw: "",
      volt: 12,
      ampere: "",
      teeth: "",
      rotation: "sinistra",
      regulator: "",
      notes: "",
      type: "motorino",
      price: 66.66,
      imageNameOriginal: "334_0.jpg",
    },
  ]
};


const connect = async() => {
  // set up database connection uri
  const connUri =
    (config.mode.production || config.mode.staging) ? // production/staging db uri
      `${process.env.MONGO_SCHEME}://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB}`
    :
    config.mode.development ? // development db uri
      `${process.env.MONGO_DEV_SCHEME}://${process.env.MONGO_DEV_URL}/${process.env.MONGO_DEV_DB}`
    :
    config.mode.test ? // test db uri
      `${process.env.MONGO_TEST_SCHEME}://${process.env.MONGO_TEST_URL}/${process.env.MONGO_TEST_DB}`
    :
      null
  ;
  if (!connUri) {
    const err = `Unforeseen mode ${JSON.stringify(config.mode)}, cannot connect database`;
    logger.error(err);
    throw new Error(err);
  }

  try {
    await mongoose.connect(connUri, {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    logger.info("Database connected");

    // show MongoDB version
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    admin.buildInfo((err, info) => {
      logger.info(`MongoDB v${info.version}`);
    });

    try {
      await populate(); // populate database with initial contents if first time
    } catch (err) {
      logger.error("Database populate error:", err);
      throw err;
    }
  } catch (err) {
    logger.error("Database connection error:", err);
    throw err;
  }
};

/**
 * first time populate static reference documents
 */
const populate = async() => {
  try {
    // check if env collection is empty
    const envCount = await Env.estimatedDocumentCount();
    if (envCount === 0) {
      await Promise.all(dbMock.env.map(async(e) => {
        await new Env(e).save();
        logger.info(`added env ${e.key} = ${e.value} to env collection`);
      }));
    }

    // check if users collection is empty
    const userCount = await User.estimatedDocumentCount();
    if (userCount === 0) {
      await Promise.all(dbMock.users.map(async(user) => {
        await new User(user).save();
        logger.info(`added user ${user.firstName} ${user.lastName} to users collection`);
      }));
    }

    // check if roles collection is empty
    const roleCount = await Role.estimatedDocumentCount();
    if (roleCount === 0) {
      await Promise.all(dbMock.roles.map(async(role) => {
        await new Role(role).save();
        logger.info(`added role ${role.name} to roles collection`);
      }));
      await addRoleToUser("admin", config.defaultUsers.admin.email);
    }

    // check if plans collection is empty
    const planCount = await Plan.estimatedDocumentCount();
    if (planCount === 0) {
      await Promise.all(dbMock.plans.map(async(plan) => {
        await new Plan(plan).save();
      }));
      logger.info("all plans have been saved");
      await addPlanToUser("unlimited", config.defaultUsers.admin.email);
    }

    // check if products collection is empty
    const productCount = await Product.estimatedDocumentCount();
    if (productCount === 0) {
      await Promise.all(dbMock.products.map(async(product) => {
        const productNew = await new Product(product).save();
        logger.info(`added product ${productNew._id} to products collection`);
      }));
    }
  } catch (err) {
    throw err;
  }
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
const addPlanToUser = async(planName, userEmail) => {
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

module.exports = {
  connect,
  populate,
};
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Env = require("./env.model.js");
const User = require("./user.model.js");
const Role = require("./role.model.js");
const Plan = require("./plan.model.js");
const Product = require("./product.model.js");
const { uploadProductImage } = require("../controllers/product.controller.js");
const { createEncryptionKey } = require("../libs/encryption");
const { logger } = require("../controllers/logger.controller.js");
const demoData = require("../../data/demo.js");
const i18n = require("../middlewares/i18n.js");
const config = require("../config.js");

const connect = async () => {
  // set up database connection uri
  const connUri = ((config.mode.production || config.mode.staging) ? // production/staging db uri
    `${process.env.MONGO_SCHEME}://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB}` :
    config.mode.development ? // development db uri
      `${process.env.MONGO_DEV_LOCAL_SCHEME}://${process.env.MONGO_DEV_LOCAL_URL}/${process.env.MONGO_DEV_LOCAL_DB}` :
      config.mode.testInCI ? // test in github actions db uri
        `${process.env.MONGO_TEST_REMOTE_SCHEME}://${process.env.MONGO_TEST_REMOTE_USER}:${process.env.MONGO_TEST_REMOTE_PASS}@${process.env.MONGO_TEST_REMOTE_URL}/${process.env.MONGO_TEST_REMOTE_DB}` :
        config.mode.test ? // test db uri
          `${process.env.MONGO_TEST_LOCAL_SCHEME}://${process.env.MONGO_TEST_LOCAL_URL}/${process.env.MONGO_TEST_LOCAL_DB}` :
          null
  ) + "?retryWrites=true&w=majority"; // standard flags:
  /**
   * Retryable writes allows MongoDB drivers to automatically retry certain write operations a single time
   * if they encounter network errors, or if they cannot find a healthy primary in the replica sets or sharded cluster.
   * Write concern describes the level of acknowledgment requested from MongoDB for write operations to a standalone
   * mongod or to replica sets or to sharded clusters. In sharded clusters, mongos instances will pass the write
   * concern on to the shards (if the replica set has 3 members that mean that majority=2, meaning that write operation
   * will receive acknowledgment after it receive success confirmation from at least 2 members).
   */

  if (!connUri) {
    const err = `Unforeseen mode ${JSON.stringify(config.mode)}, cannot connect database`;
    logger.error(err);
    throw new Error(err);
  }

  if (process.env.GITHUB_ACTIONS) { // TODO: DEBUG ONLY
    console.log("🔍 CI detected");
    console.log("🔍 Mongo connection parameters:");
    console.log("- SCHEME:", process.env.MONGO_TEST_REMOTE_SCHEME ? "✅" : "❌");
    console.log("- USER:", process.env.MONGO_TEST_REMOTE_USER ? "✅" : "❌");
    console.log("- PASS:", process.env.MONGO_TEST_REMOTE_PASS ? "✅" : "❌");
    console.log("- URL:", process.env.MONGO_TEST_REMOTE_URL ? "✅" : "❌");
    console.log("- DB:", process.env.MONGO_TEST_REMOTE_DB ? "✅" : "❌");
  }
  
  try {
    logger.info("Connecting to database uri:", connUri.replace(`:${process.env.MONGO_PASS}`, ":*****"));
    await mongoose.connect(connUri);

    // wait until connection is fully established
    await mongoose.connection.asPromise();
    if (!mongoose.connection.db) {
      throw new Error("Database connection is established but db is not yet available even after promise await");
    }
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
      /*
      const userCount = await User.estimatedDocumentCount();
      if (userCount === 0) {
        for (const role of Object.keys(demoData.users)) {
          await User.create(demoData.users[role]);
        }
      }
      */
      for (const role of Object.keys(demoData.users)) {
        const userData = demoData.users[role];
        let existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          existingUser = await User.create(userData);
          // create user's encryption key and save it
          const encryptionKey = await createEncryptionKey(existingUser);
          existingUser.encryptionKey = encryptionKey;
          await existingUser.save();
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
        for (const role of demoData.roles) {
          await Role.create(role);
        }
      }
      await addRoleToUser("admin", demoData.users.admin.email);
      if (demoData.users.operator) await addRoleToUser("operator", demoData.users.operator.email);
      if (demoData.users.dealer) await addRoleToUser("dealer", demoData.users.dealer.email);
      if (demoData.users.user) await addRoleToUser("user", demoData.users.user.email);
      if (demoData.users.userSocial) await addRoleToUser("user", demoData.users.userSocial.email);
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
      }
      await addPlanToUser("unlimited", demoData.users.admin.email);
    } catch (err) {
      logger.error("Error populating plans collection:", err.message);
      throw err;
    }

    // check if products collection is empty
    try {
      const productCount = await Product.estimatedDocumentCount();
      if (productCount === 0) {
        // add products
        for (const data of demoData.products) {
          await Product.create(data);
        }
        // add product images
        for (const data of demoData.products) {
          await addImageToProduct(demoData.productsImages[data.mdaCode], data.mdaCode);
        }
      }
    } catch (err) {
      logger.error("Error populating products collection:", err.message);
      throw err;
    }
  } catch (err) {
    logger.error("Error in populate:", err.message);
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
    if (!user.roles.find(r => r.toString() === role._id.toString())) {
      user.roles.push(role._id);

      // save the updated user
      await user.save();
 
      logger.info(`added "${roleName}" role to "${userEmail}" user`);
    }
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
    if (user.plan?._id.toString() !== plan._id.toString()) {
      user.plan = plan;

      // save the updated user
      await user.save();

      logger.info(`added "${planName}" plan to "${userEmail}" user`);
    }
  } catch (err) {
    logger.error(`error adding "${planName}" plan to "${userEmail}" user:`, err);
    throw err;
  }
};

// add admin role to admin user
const addImageToProduct = async (imagePath, productMdaCode) => {
  try {
    // find the product by its mdaCode
    const product = await Product.findOne({
      mdaCode: productMdaCode
    });
    if (!product) {
      throw new Error(`product with mdaCode "${productMdaCode}" not found`);
    }

    const absoluteImagePath = path.resolve(imagePath);

    // check if the image exists
    if (!fs.existsSync(absoluteImagePath)) {
      throw new Error(`Image not found: ${absoluteImagePath}`);
    }

    // read the image file into a buffer
    const imageBuffer = fs.readFileSync(absoluteImagePath);

    // create a mock req object
    const req = {
      file: {
        path: imagePath,
        originalname: path.basename(imagePath),
        buffer: imageBuffer,
      },
      body: {
        productId: product._id
      },
      t: i18n.t,
    };

    // upload the product image
    await uploadProductImage(req, {
      status: () => ({
        json: () => {}
      })
    }, (err) => {
      if (err) {
        throw err;
      }
    });

    logger.info(`added image to product with mdaCode "${productMdaCode}"`);
  } catch (err) {
    logger.error(`error adding image to product with mdaCode "${productMdaCode}":`, err);
    throw err;
  }
};

const initializeDatabase = async () => {
  try {
    await connect();
    await populate();
  } catch (err) {
    logger.error("Error during database initialization:", err);
    throw err;
  }
};

module.exports = {
  connect,
  populate,
  initializeDatabase,
};
const mongoose = require("mongoose");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const EnvSchema = mongoose.Schema({
  key: {
    type: String,
  },
  value: {
    type: String,
  },
});

let env = {}; // object to hold the environment in memory
let lastEnvLoadTime = 0; // last Env load time, initially

// load env from MongoDB
EnvSchema.statics.load = async function() {
  const currentTime = Date.now();
  if (currentTime - lastEnvLoadTime > (config.envReloadIntervalSeconds * 1000)) {
    try {
      const envs = await this.find({}); // retrieve all documents in the collection
      env = envs.reduce((acc, doc) => {
        acc[doc.key] = doc.value; // build a key-value object from the documents
        return acc;
      }, {});
      lastEnvLoadTime = currentTime;
    } catch (err) {
      logger.error(`Error loading env from database: ${err}`);
    }
  }
  return env;
};

// store env to MongoDB
EnvSchema.statics.store = async(newEnv) => {
  try {
    // iterate over the newEnv object and upsert each key-value pair in the collection
    for (const [key, value] of Object.entries(newEnv)) {
      await this.updateOne({ key }, { key, value }, { upsert: true });
    }
    //logger.info("Env stored to database");
  } catch (err) {
    logger.error(`Error storing env to database: ${err}`);
    return false;
  }
  return true;
};


module.exports = mongoose.model("Env", EnvSchema);

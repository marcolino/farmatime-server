const path = require("path");

/*
// environment configuration
if (process.env.NODE_ENV === "production") { // load environment variables
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  //console.info("Production environment");
}
if (process.env.NODE_ENV === "staging") { // load environment variables
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  //console.info("Staging environment");
}
if (process.env.NODE_ENV === "development") { // load environment variables
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") });
  //console.info("Development environment");
}
*/
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const config = require("../src/config");
const { inject } = require("../src/helpers/misc");

// injected config file name
const configFileNameInjected = "config.json";
// the client root: the folder with the frontend site
const rootClient = path.join(__dirname, "..", "client", "build");
// the client src root, used to inject client src
const rootClientSrc = path.join(__dirname, "..", config.clientSrc);


// inject client app config to configFileNameInjected
inject(rootClient, rootClientSrc, configFileNameInjected, config.app);
  
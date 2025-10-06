const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const config = require("../src/config");
const { inject } = require("../src/libs/misc");

// injected config file name
const configFileNameInjected = "config.json";
// the client root: the folder with the frontend site
const rootClient = path.join(__dirname, "..", "client", "build");
// the client src root, used to inject client src
const rootClientSrc = path.join(__dirname, "..", config.clientSrc);

// inject client app config to configFileNameInjected
inject(rootClient, rootClientSrc, configFileNameInjected, config.app);
  
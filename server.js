const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const i18nextMiddleware = require("i18next-http-middleware");
const morgan = require("morgan");
const compression = require("compression");
const { logger } = require("./src/controllers/logger.controller");
const db = require("./src/models");
const { assertEnvironment } = require("./src/helpers/environment");
const { audit } = require("./src/helpers/messaging");
const emailService = require("./src/services/email.service");
const { localeDateTime, inject } = require("./src/helpers/misc");
const rateLimitMiddleware = require("./src/middlewares/rateLimit");
const i18n = require("./src/middlewares/i18n");
const config = require("./src/config");

const index = "index.html"; // index file name to be injected
const indexInjected = "index-injected.html"; // injected index file name


// instantiate express app
const app = express();

// use compression
app.use(compression());

// log requests to express output, while developing
if (config.mode.development) {
  app.use(morgan("dev"));
}

// enable CORS, and whitelist our urls
app.use(cors({
  origin: Object.keys(config.clientDomains).map(domain => config.clientDomains[domain]),
}));

// parse requests of content-type - application/json
app.use(express.json({
  limit: config.api.payloadLimit, // limit payload to avoid too much data to be uploaded
}));

// add default headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, Content-Type, Accept, Authorization"
  );
  next();
});

// custom middleware to merge req.query and req.body to req.parameters
app.use((req, res, next) => {
  req.parameters = Object.assign({}, req.query, req.body);
  next();
});

// handle version, if needed
app.use((req, res, next) => {
  // req.version is used to determine the version
  req.version = req.headers["accept-version"];
  next();
});

// use i18n
app.use(i18nextMiddleware.handle(i18n/*ext*/));

// apply rate limiting middleware globally
app.use(rateLimitMiddleware);

// verify if request verb is allowed
app.use((req, res, next) => {
  //if ((req.method !== "GET") && (req.method !== "POST")) { // check verb is allowed # TODO: make a list of accetted API methods in config.api
  if (config.api.allowedVerbs.includes(req.method)) {
    next();
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
});

// environment configuration
if (config.mode.production) { // load environment variables from .env file
  logger.info("Loading production environment");
  require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
} else { // load environment variables from .env.dev file
  logger.info("Loading development environment");
  require("dotenv").config({ path: path.resolve(__dirname, "./.env.dev") });
}

// setup the email service
emailService.setup(process.env.BREVO_EMAIL_API_KEY);

// assert environment to be fully compliant with expectations
assertEnvironment();

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

// connect to database
db.mongoose
  .connect(connUri, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    logger.info("Successfully connected to MongoDB");
    try {
      db.populate(); // populate database with initial contents if first time
    } catch(err) {
      logger.error("Database populate error:", err.message);
      process.exit(-1);
    }
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err}`);
    process.exit(-1);
  })
;


// routes
require("./src/routes/auth.routes")(app);
require("./src/routes/user.routes")(app);
require("./src/routes/articles.routes")(app);
require("./src/routes/payment.routes")(app);
require("./src/routes/misc.routes")(app);

// expose a /public folder on server
if (config.publicBasePath) {
  app.use(express.static(path.join(__dirname, config.publicBasePath)));
}

// handle errors in API routes
app.use((err, req, res, next) => {
  res.locals.error = err;
  logger.error(`Internal server error: ${err.message}`);
  return res.status(err.status || 500).json(
    { message: `${err.message || req.t("Internal server error")} - ${req.t("We are aware of this error, and working to solve it")}. ${req.t("Please, retry soon")})}` }
  );
});

// handle not found API routes
app.all("/api/*", (req, res, next) => {
  return res.status(404).json({ message: "Not found" });
})

// "/client/build" is the client root: a folder with the frontend site
const rootClient = path.join(__dirname, "client", "build");
// "/coverage" is the coverage root, used while developing only
const rootCoverage = path.join(__dirname, "coverage");

// handle client route for base urls
app.get("/", async (req, res) => {
  injectIndexIfNotPresent();
  res.sendFile(path.resolve(rootClient, indexInjected));
});

// handle static routes
app.use("/", express.static(rootClient)); // base client root
/*(!config.mode.production) && */ app.use("/coverage", express.static(rootCoverage)); // coverage root

// handle client routes for all other urls
app.get("*", (req, res) => {
  injectIndexIfNotPresent();
  res.sendFile(path.resolve(rootClient, indexInjected));
});

// inject index file with client app config in indexInjected file
const injectIndexIfNotPresent = () => {
  // TODO: check also it exists but is older than config.js ...
  if (!fs.existsSync(path.resolve(rootClient, indexInjected))) {
    try {
      inject(rootClient, index, indexInjected, config.app);
    } catch (err) {
      logger.error("Error injecting config app data into index file:", err);
      throw err;
    }
  }
};

// set port and listen for requests
if (!config.mode.test) { // avoid listening while testing
  const PORT = process.env.PORT || config.api.port; // TODO: use only process.env...
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    // TODO: restore a working audit...
    //audit({ subject: `server startup`, htmlContent: `Server is running on port ${PORT} on ${localeDateTime()}` });
  });
} else { // export app for testing
  module.exports = app;
}

const express = require("express");
const path = require("path");
const cors = require("cors");
const i18nextMiddleware = require("i18next-http-middleware");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const { logger } = require("./src/controllers/logger.controller");
const db = require("./src/models");
const Env = require("./src/models/env.model");
const { assertEnvironment } = require("./src/helpers/environment");
const { audit } = require("./src/helpers/messaging");
const emailService = require("./src/services/email.service");
const { localeDateTime, inject } = require("./src/helpers/misc");
const i18n = require("./src/middlewares/i18n");
const rateLimit = require("./src/middlewares/rateLimit");
const checkReferer = require("./src/middlewares/checkReferer");
const passportSetup = require("./src/middlewares/passportSetup");
const config = require("./src/config");

const configFileNameInjected = "config.json"; // injected config file name

console.log('Current log modes:', {
  production: config.mode.production,
  staging: config.mode.staging,
  development: config.mode.development,
  test: config.mode.test
});

// environment configuration
if (config.mode.production) { // load environment variables from the provider "secrets" setup (see `yarn fly-import-secrets`)
  logger.info("Production environment");
}
if (config.mode.staging) { // load environment variables from .env file
  try {
    require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
    logger.info("Staging environment");
  } catch (err) {
    logger.error("Error loading ./.env file:", err);
  }
}
if (config.mode.development) { // load environment variables from .env.dev file
  require("dotenv").config({ path: path.resolve(__dirname, "./.env.dev") });
  logger.info("Development environment");
}
if (config.payment.stripe.enabled) {
  logger.info(`Stripe payment mode is ${config.mode.livestripe}`);
}

const app = express();

//logger.log("HELMET:", helmet.contentSecurityPolicy.getDefaultDirectives());
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: [
      "'self'",
      config.baseUrl,
                                      "http://localhost:5000", // TODO...
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://www.gravatar.com",
      "https://secure.gravatar.com",
      "https://a.tile.openstreetmap.org",
      "https://b.tile.openstreetmap.org",
      "https://c.tile.openstreetmap.org",
      //"https://cdnjs.cloudflare.com",
      "https://accounts.google.com", // allow Google OAuth endpoint
      "https://oauth2.googleapis.com", // allow OAuth token exchange
    ],
    fontSrc: [
      "'self'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ],
    imgSrc: [
      "'self'",
      "https: data: blob:",
      "https://www.gravatar.com",
      "https://secure.gravatar.com",
      "https://a.tile.openstreetmap.org",
      "https://b.tile.openstreetmap.org",
      "https://c.tile.openstreetmap.org",
      "https://cdnjs.cloudflare.com",
      //"https://flagcdn.com",
    ]
  }
}));

// use compression
app.use(compression());

/*
// configure Morgan to use the Winston stream, so it goes to betterstack, too, in production
app.use(morgan("combined", {
  stream: { // a Morgan stream
    write: (message) => {
      logger.info(message.trim()); // use Winston's info level for HTTP request logs
    }
  }
}));
*/

// enable CORS, and whitelist our urls
app.use(cors({
  origin: config.clientDomains, // the accepted client domains
  methods: "GET,POST", // allowed methods
  credentials: true, // if you need cookies/auth headers
  //exposedHeaders: ["X-Maintenance-Status"],
}));

// initialize Passport and session management using the middleware
passportSetup(app);

// parse requests of content-type - application/json
app.use(express.json({
  limit: config.api.payloadLimit, // limit payload to avoid too much data to be uploaded
}));

// use i18n
app.use(i18nextMiddleware.handle(i18n/*ext*/));

// apply rate limiting middleware globally
app.use(rateLimit);

// apply check referer middleware globally
app.use(checkReferer);

// add default headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
  next();
});

// merge req.query and req.body to req.parameters
app.use((req, res, next) => {
  req.parameters = Object.assign({}, req.query, req.body);
  next();
});

// handle maintenance mode
app.use(async(req, res, next) => {
  const env = await Env.load(); // load env and access it
  if (env.MAINTENANCE === "true") {
    return res.status(503).json({ message: "On maintenance" });
  }
  next();
});

// handle version, if needed
app.use((req, res, next) => {
  // req.version is used to determine the API default version
  req.version = req.headers["accept-version"];
  next();
});

// verify if request verb is allowed
app.use((req, res, next) => {
  if (config.api.allowedVerbs.includes(req.method)) {
    next();
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
});

app.use((req, res, next) => { // DEBUG ONLY
  console.log(`METHOD & URL: ${req.method} ${req.url}`);
  next();
});

// setup the email service
emailService.setup(process.env.BREVO_EMAIL_API_KEY);

// assert environment to be fully compliant with expectations
assertEnvironment();

// the client root: the folder with the frontend site
const rootClient = path.join(__dirname, "client", "build");
// the client src root, used to inject client src
const rootClientSrc = path.join(__dirname, config.clientSrc);
// the coverage root (used while developing only)
const rootCoverage = path.join(__dirname, "coverage");

// routes handling
require("./src/routes/auth.routes")(app);
require("./src/routes/user.routes")(app);
require("./src/routes/product.routes")(app);
require("./src/routes/payment.routes")(app);
require("./src/routes/misc.routes")(app);

// expose a /public folder on server
if (config.publicBasePath) {
  app.use(express.static(path.join(__dirname, config.publicBasePath)));
}

// handle errors in API routes
app.use((err, req, res, next) => {
  res.locals.error = err;
  logger.error(`Server error: ${err.message}`);
  let status = err.status || 500;
  let message = `${err.message || req.t("Server error")}`
  if (status === 500) {
    message += ` -  ${req.t("We are aware of this error, and working to solve it")}. ${req.t("Please, retry soon")}`;
  }
  return res.status(status).json({ message });
});

// handle static routes
app.use("/", express.static(rootClient)); // base client root

//!config.mode.production && app.use("/coverage", express.static(rootCoverage)); // coverage root

// handle not found API routes
app.all(/^\/api(\/.*)?$/, (req, res) => {
  return res.status(404).json({ message: "Not found" });
})

// handle client route for base urls
app.get("/", async(req, res) => {
  //res.setHeader("Expires", new Date(Date.now() + 3600000).toUTCString()); 
  // if (process.env.MAINTENANCE === "true") {
  //   res.header("X-Maintenance-Status", "true");
  // }
  res.sendFile(path.resolve(rootClient, "index.html"));
});

// handle client routes for all other urls
app.get("*", (req, res) => {
  res.sendFile(path.resolve(rootClient, "index.html"));
});

// connect to database and let express server start listening for requests
async function start() {
  try {
    await db.connect(); // connect to database, synchronously
  } catch (err) {
    logger.error(`Database connection error: ${err}`, `${process.env.MONGO_SCHEME}://${process.env.MONGO_URL}/${process.env.MONGO_DB}`);
    process.exit(1);
  }

  if (config.mode.development) { // inject only while developing (for production there is a script to bve called from the client before the builds)
    // inject client app config to configFileNameInjected
    inject(rootClient, rootClientSrc, configFileNameInjected, config.app);
  }
  
  try { // listen for requests
    const port = config.api.port;
    const host = "0.0.0.0";
    app.listen(port, host, () => {
      logger.info(`Server is running on ${host}:${port}`);
      // notify administration abount server start up
      //audit({ subject: `server startup`, htmlContent: `Server is running on ${host}:${port} on ${localeDateTime()}` });
    });
  } catch (err) {
    logger.error(`Server listen error: ${err}`);
  }
};

// export the app
module.exports = app;

// if not in test mode, start the server
if (!config.mode.test) {
  start();
}

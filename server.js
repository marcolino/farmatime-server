const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
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
const { localeDateTime, inject, remoteAddress } = require("./src/helpers/misc");
const i18n = require("./src/middlewares/i18n");
const rateLimit = require("./src/middlewares/rateLimit");
const checkReferer = require("./src/middlewares/checkReferer");
const passportSetup = require("./src/middlewares/passportSetup");
const config = require("./src/config");

const configFileNameInjected = "config.json"; // injected config file name

// environment configuration
if (config.mode.production) { // load environment variables from the provider "secrets" setup (see `yarn fly-import-secrets`)
  logger.info("Production environment");
}
if (config.mode.development) {
  logger.info("Development environment");
}
if (config.mode.staging) {
  logger.info("Staging mode");
}
if (config.payment.stripe.enabled) {
  logger.info(`Stripe is enabled, and Stripe mode is ${config.mode.stripelive}`);
}

const app = express();

//logger.log("HELMET CSS:", helmet.contentSecurityPolicy.getDefaultDirectives());
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: [
      "'self'"
    ],
    connectSrc: [
      "'self'",
      ...config.security.allowedReferers.connectSrc,
    ],
    fontSrc: [
      "'self'",
      ...config.security.allowedReferers.fontSrc,
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      ...config.security.allowedReferers.styleSrc,
    ],
    imgSrc: [
      "'self'",
      "https: data: blob:",
      ...config.security.allowedReferers.imgSrc,
    ]
  }
}));

// use cookie-parser middleware
app.use(cookieParser());

// use compression
app.use(compression());

// custom Morgan log format based (without user agent)
morgan.format("api-logs", ":method :url HTTP/:http-version :status ':referrer' - :response-time ms");

// log API requests with Morgan
app.use(morgan("api-logs", {
  stream: {
    write: (message) => {
      if (message.includes("/api/")) {
        logger.info(message.trim());
      }
    }
  }
}));

// enable CORS, and whitelist our urls
app.use(cors({
  origin: (origin, callback) => { // define the accepted client domains
    if (!origin || config.clientDomains.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "OPTIONS"], // allowed methods
  //allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: true, // if cookies/auth headers are needed
}));

// initialize Passport and session management using the middleware
passportSetup(app);

// parse requests of content-type: application/json
app.use(express.json({
  limit: config.api.payloadLimit, // limit payload to avoid too much data to be uploaded
}));

// apply rate limiting middleware globally
app.use(rateLimit);

// use i18n
app.use(i18nextMiddleware.handle(i18n));

// apply check referer middleware globally
app.use(checkReferer);

// merge req.query and req.body to req.parameters
app.use((req, res, next) => {
  req.parameters = Object.assign({}, req.query, req.body);
  next();
});

// handle maintenance mode
app.use(async (req, res, next) => {
  const env = await Env.load(); // load env and access it (it is cached for config.envReloadIntervalSeconds)
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

// assert environment to be fully compliant with expectations
assertEnvironment();

// setup the email service
emailService.setup(process.env.BREVO_EMAIL_API_KEY);

// the client root: the folder with the frontend site
const rootClient = path.join(__dirname, "client", "build");
// the client src root, used to inject client src
const rootClientSrc = path.join(__dirname, config.clientSrc);
// the coverage root (used while developing only)
const rootCoverage = path.join(__dirname, "coverage");

// before standard routes handle not found API routes BEFORE registering specific routes
app.all(/^\/api(\/.*)?$/, (req, res, next) => {
  // use next() instead of returning 404 immediately
  next();
});

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

// handle static routes
app.use("/", express.static(rootClient)); // base client root

// handle route for coverage
if (!config.mode.production) {
  app.use("/coverage", express.static(rootCoverage)); // coverage root
}

// handle not found API routes
app.all(/^\/api(\/.*)?$/, (req, res) => {
  return res.status(404).json({ message: "Not found" });
});

// handle client routes for all other urls
app.get("*", (req, res) => {
  res.sendFile(path.resolve(rootClient, "index.html"));
});

// handle errors in API routes
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars -- next is needed to be considered error handling
  logger.error("Server error:", err);
  let status = err.status || 500;
  let stack = err.stack; 
  // include stack trace in development only
  let message = `${err.message || req.t("Server error")}`;
  if (status === 500) { // audit errors
    audit({
      req, mode: "error", subject: `Error: ${message}`, htmlContent: `
<pre>
  Status: ${status}
  Mode: ${process.env.NODE_ENV}
  IP: ${remoteAddress(req)}
  Date: ${localeDateTime()}
  Stack: ${stack}
</pre>`,
    });
    message += ` -  ${req.t("We are aware of this error, and working to solve it")}. ${req.t("Please, retry soon")}`;
  }
  return res.status(status).json({
    message,
    ...((config.mode.development || config.mode.test) && (status === 500) && { stack }),
  });
});


// let express server start listening for requests
async function start() {

  await db.dbReady; // await the database to be ready

  if (config.mode.development) { // inject only while developing (for production there is a script to bve called from the client before the builds)
    // inject client app config to configFileNameInjected
    inject(rootClient, rootClientSrc, configFileNameInjected, config.app);
  }
  
  try { // listen for requests
    const port = config.api.port;
    const host = "0.0.0.0";
    app.listen(port, host, () => {
      logger.info(`Server is running on ${host}:${port}`);
      if (config.mode.production) { // audit server start up
        audit({ req: null, mode: "action", subject: `Server startup`, htmlContent: `Server is running on ${host}:${port} on ${localeDateTime()}` });
      }
    });
  } catch (err) {
    logger.error("Server listen error:", err);
    throw err;
  }
}

// handle all uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});

// handle all unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  if (reason instanceof Error) {
    logger.error(`Unhandled rejection at promise: ${promise}, reason: ${reason.message}, stack: ${reason.stack}`);
  } else {
    logger.error(`Unhandled rejection at promise: ${promise}, reason: ${JSON.stringify(reason)}`);
  }
});

// if not in test mode, start the server
if (!config.mode.test) {
  start();
}

// export the app
module.exports = app;

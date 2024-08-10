const express = require("express");
const path = require("path");
const cors = require("cors");
const i18next = require("i18next");
const backend = require("i18next-node-fs-backend");
const i18nextMiddleware = require("i18next-http-middleware");
const morgan = require("morgan");
const compression = require("compression");
const { logger } = require("./src/controllers/logger.controller");
const db = require("./src/models");
const { assertEnvironment } = require("./src/helpers/environment");
const { setupEmail, notification } = require("./src/helpers/notification");
const { nowLocaleDateTime } = require("./src/helpers/misc");
const { rateLimitMiddleware }  = require("./src/middlewares/rateLimit");
const config = require("./src/config");

const production = (process.env.NODE_ENV === "production");
const testing = typeof global.it === "function"; // testing (mocha/chai/...)

// setup I18N
i18next
  .use(backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    debug: false,
    backend: {
      loadPath: __dirname + "/src/locales/{{lng}}/{{ns}}.json"
    },
    fallbackLng: config.languages.default,
    preload: [config.languages.default]
  })
;
    
const app = express();

//setTimeout(() => { // debug throttling (REMOVEME)
//}, 2500); // debug throttling (REMOVEME)   

// apply rate limiting middleware globally
//app.use(rateLimitMiddleware);

// use compression
app.use(compression());

// log requests to express output, while developing
if (!production) {
  app.use(morgan("dev"));
}

// enable CORS, and whitelist our domains
app.use(cors({
  origin: Object.keys(config.clientDomains).map(domain => config.clientDomains[domain]),
}));

// parse requests of content-type - application/json
app.use(express.json({
  limit: config.api.payloadLimit, // limit payload to avoid too much data to be uploaded
}));

// add default headers
app.use((req, res, next) => {
  res.header(
    "access-control-allow-headers",
    "origin",
    "content-type",
    "accept",
    "authorization",
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
app.use(i18nextMiddleware.handle(i18next));

// environment configuration
logger.info("-----");
if (production) { // load environment variables from .env file
  logger.info("Loading production environment");
  require("dotenv").config({ path: path.resolve(__dirname, "./.env") });
} else { // load environment variables from .env.dev file
  logger.info("Loading test environment");
  require("dotenv").config({ path: path.resolve(__dirname, "./.env.dev") });
}

// setup email
setupEmail();

// assert environment to be fully compliant with expectations
assertEnvironment();

// set up database connection uri
const connUri =
  production ?
    // production db uri
    `${process.env.MONGO_SCHEME}://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/${process.env.MONGO_DB}` :
  testing ?
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

// expose a /public folder on server
if (config.publicBasePath) {
  app.use(express.static(path.join(__dirname, config.publicBasePath)));
}

// serve the static files from the client - "client/build" is a folder with the frontend site
const rootClient = path.join(__dirname, "client", "build");
app.use(express.static(rootClient));

// handle errors in API routes
app.use((err, req, res, next) => {
  res.locals.error = err;
  const status = err.status || 500;
  const error = err.message || "Internal server error";
  res.status(status);
  logger.error({ error });
  //if (req.accepts("json")) {
  return res.json({ error });
  //}
  //return res.type("txt").send(error);
});

// handle not found API routes
app.all("/api/*", (req, res, next) => {
  if ((req.method !== "GET") && (req.method !== "POST")) { // check verb is allowed
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  res.status(404);
  //if (req.accepts("json")) {
  return res.json({ error: "Not found" });
  //}
  //return res.type("txt").send("Not found");
})

// handle not found client routes
app.get("*", (req, res) => {
  res.sendFile(path.join(rootClient, "index.html"));
});

// set port and listen for requests
if (require.main === module) { // avoid listening while testing
  const PORT = process.env.PORT || config.api.port;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    notification({subject: "Startup", html: `Server is running on port ${PORT} on ${nowLocaleDateTime()}`});
  });
} else { // export app for testing
  module.exports = app;
}

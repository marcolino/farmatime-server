const winston = require("winston");
const { Logtail } = require('@logtail/node');
const { LogtailTransport } = require('@logtail/winston');
const util = require("util");
const config = require("../config");
require("winston-syslog");

const hostname = require("os").hostname;

let logger = null;
const transports = [];
const exceptionHandlers = [];
const colorize = false;
const logtail = new Logtail(process.env.BETTERSTACK_API_TOKEN);

try {
  transports.push(
    new winston.transports.File({ // local file transport
      filename: config.logs.file,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(info => {
          const timestamp = info.timestamp.trim();
          const level = info.level;
          const message = (typeof info?.message === "string" ? info.message : "").trim();
          const args = info[Symbol.for("splat")];
          const strArgs = (args || []).map(arg => {
            return util.inspect(arg, { colors: colorize });
          });
          return `${level}: ${timestamp} ${message} ${strArgs}`;
        }),
      ),
      timestamp: true,
      colorize: colorize,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      prettyPrint: true,
      json: true,
      maxsize: 5242880
    }),
  );

  transports.push(
    new LogtailTransport(logtail), // BetterStack transport
  );

  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(info => {
        const timestamp = info.timestamp.trim();
        const level = info.level;
        const message = (info.message || "").trim();
        const args = info[Symbol.for("splat")];
        const strArgs = (args || []).map(arg => arg).join(" ");
        return `${level}: ${timestamp} ${message} ${strArgs}`;
      })
    ),
    level: config.logs.levelMap[ // TODO: choose levels for all modes...
      config.mode.production ? "debug" :
      config.mode.development ? "debug" :
      config.mode.test ? "test" :
      "debug"
    ],
    handleExceptions: true,
    prettyPrint: true,
    colorize: colorize,
  }));
} catch(err) {
  console.error("Winston transports creation error:", err);
  throw(err);
}

try {
  exceptionHandlers.push(
    new winston.transports.File({ filename: config.logs.file }), // local file exceptions transport
  );

  if (config.mode.production && config.logs.betterstack.enable) { // use logtail transport on betterstack only in production
    exceptionHandlers.push(
      new LogtailTransport(logtail), // BetterStack exceptions transport
    );
  }

  if (config.mode.production && config.logs.papertrail.enable) { // use syslog transport on papertrail only in production
    exceptionHandlers.push(
      new winston.transports.Syslog({
        host: config.logs.papertrail.host,
        port: config.logs.papertrail.port,
        app_name: config.api.name,
        hostname,
      })
    );
  }
} catch(err) {
  console.error("Winston exceptions handlers creation error:", err);
  throw(err);
}

try {
  logger = winston.createLogger({
    transports,
    exceptionHandlers
  });
} catch(err) {
  console.error("Winston logger creation error:", err);
}

module.exports = {
  logger,
};

const winston = require("winston");
const util = require("util");
const config = require("../config");
require("winston-syslog");

const localhost = require("os").hostname;
const test = (require.main === module);
const colors = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};

let logger, transports, exceptionHandlers = null;
const colorize = false;
try {
  transports = [
    new winston.transports.File({
      filename: config.logs.file,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(info => {
          const timestamp = info.timestamp.trim();
          const level = info.level;
          //const message = (info.message || "").trim();
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
  ];

  exceptionHandlers = [
    new winston.transports.File({ filename: config.logs.file })
  ];

  if (process.env.NODE_ENV === "production") { // use syslog transport on papertrail only in production
    exceptionHandlers.push(
      new winston.transports.Syslog({
        host: config.logs.papertrail.host,
        port: config.logs.papertrail.port,
        app_name: config.api.name,
        localhost,
      })
    );
  }

  if (process.env.NODE_ENV !== "production") { // if we're not in production then also log to the `Console` transport
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => {
          const timestamp = info.timestamp.trim();
          const level = info.level;
          const message = (info.message || "").trim();
          const args = info[Symbol.for("splat")];
          // const strArgs = (args || []).map(arg => {
          //   return util.inspect(arg, { colors: colorize });
          // }).join(" ");
          const strArgs = (args || []).map(arg => arg).join(" ");
          return `${level}: ${timestamp} ${message} ${strArgs}`;
        })
      ),
      level: test ? "debug" : "warning", // if we are in test skip logging upper than warning levels (notice, info, debug)
      handleExceptions: true,
      prettyPrint: true,
      colorize: colorize,
    }));
  }
} catch(err) {
  console.error("Winston transports creation error:", err); // nothing better to do on errors while setting up logger...
  throw(err);
}

try {
  logger = winston.createLogger({
    transports,
    exceptionHandlers
  });
} catch(err) {
  console.error("Winston logger creation error:", err); // nothing better to do on errors while setting up logger...
}

module.exports = {
  logger,
  colors,
};

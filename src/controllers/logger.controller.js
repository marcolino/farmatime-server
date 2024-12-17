const winston = require("winston");
const stream = require("stream");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const config = require("../config");
require("winston-syslog");

let logger = null;
const transports = [];
const exceptionHandlers = [];
const colorize = true;
const logtail = new Logtail(process.env.BETTERSTACK_API_TOKEN);


const isString = (x) => {
  return (typeof x === "string" || x instanceof String);
};

class LogtailStream extends stream.Writable {
  constructor(logtail) {
    super({ objectMode: true });
    this.logtail = logtail;
  }

  _write(info, encoding, callback) {
    //const { message, metadata } = info; // use the formatted message
    // extract level, message, and metadata
    const { level, message } = info;

    // extract additional arguments from Symbol(splat)
    const splatSymbol = Object.getOwnPropertySymbols(info).find((sym) => sym.toString() === "Symbol(splat)");
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    // combine level and message
    let logMessage = `[${level.toUpperCase()}] ${message}`;

    // add splat arguments to the message
    if (splatArgs.length) {
      logMessage += ` ${splatArgs.map(arg => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" ")}`;
    }

    // send the log data to Logtail
    this.logtail.log(logMessage, {})
      .then(() => callback())
      .catch(callback)
    ;
    
    // // construct metadata including splat arguments
    // const metadata = {
    //   level: level.toUpperCase(), // ensure level is included
    //   ...(splatArgs.length && { args: splatArgs }),
    // };

    // // send the log data to Logtail
    // this.logtail.log(message, metadata)
    //   .then(() => callback())
    //   .catch(callback)
    //;
  }
}

const formatWithArgs = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const { timestamp, level, message/*, ...meta*/ } = info;

    // extract additional arguments from Symbol(splat)
    const splatSymbol = Object.getOwnPropertySymbols(info).find((sym) => sym.toString() === "Symbol(splat)");
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    // combine meta and splatArgs into a clean array or object
    //const metadata = Object.keys(meta).length ? meta : undefined;
    const extraArgs = splatArgs.length ? splatArgs : undefined;

    // build the log output
    let logOutput = `${level.toUpperCase()}: ${timestamp} ${message}`;
    if (extraArgs) {
      extraArgs.forEach(extraArg => {
        logOutput += ` ${isString(extraArg) ? extraArg : JSON.stringify(extraArg)}`;
      });
    }

    return logOutput;
  })
);



try {
  transports.push(
    new winston.transports.File({ // File transport
      filename: config.logs.file.name,
      format: formatWithArgs,
      level: config.logs.levelMap.development,
      handleExceptions: true,
      maxsize: config.logs.file.maxsize,
    }),
    new winston.transports.Stream({ // BetterStack transport stream
      stream: new LogtailStream(logtail),
      format: formatWithArgs,
      level: config.logs.levelMap.development,
      handleExceptions: true,
      colorize,
    }),
    new winston.transports.Console({
      format: formatWithArgs,
      level:
        config.mode.production ? config.logs.levelMap.production :
        config.mode.staging ? config.logs.levelMap.staging :
        config.mode.development ? config.logs.levelMap.development :
        config.mode.test ? config.logs.levelMap.test :
        "debug"
      ,
      handleExceptions: true,
      colorize,
    })
  );
} catch (err) {
  console.error("Winston transports creation error:", err);
  throw err;
}

try {
  exceptionHandlers.push(
    new winston.transports.File({ filename: config.logs.file.name }),
    new LogtailTransport(logtail)
  );
} catch (err) {
  console.error("Winston exceptions handlers creation error:", err);
  throw err;
}

try {
  logger = winston.createLogger({
    level: "debug", // default log level for transports that don’t override it
    format: winston.format.combine( // default format for transports that don’t override it
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports,
    exceptionHandlers,
  });
} catch (err) {
  console.error("Winston logger creation error:", err);
  throw err;
}

module.exports = {
  logger,
};

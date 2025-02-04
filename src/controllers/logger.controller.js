const winston = require("winston");
const stream = require("stream");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const { decode } = require("html-entities");
const config = require("../config");
require("winston-syslog");


let logger = null;
const transports = [];
const exceptionHandlers = [];
const colorize = false; // TODO: `true` does not seem to work on any transport...
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
    const { level, message, ...rest } = info;
    const splatSymbol = Object.getOwnPropertySymbols(info).find(
      (sym) => sym.toString() === "Symbol(splat)"
    );
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    let logMessage = `[${level.toUpperCase()}] ${message}`;
    if (splatArgs.length) {
      logMessage += ` ${splatArgs
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")}`;
    }

    // const cleanMetadata = Object.entries(rest)
    //   .filter(([, value]) => value !== undefined && value !== null)
    //   .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    // decode any encoded characters
    logMessage = decode(logMessage);

    this.logtail
      .log(logMessage, null) //Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null)
      .then(() => callback())
      .catch(callback);
  }
}

class LogtailStream_OLD extends stream.Writable {
  constructor(logtail) {
    super({ objectMode: true });
    this.logtail = logtail;
  }

  _write(info, encoding, callback) {
    // extract level and message
    const { level, message, ...rest } = info;
    const metadata = { ...rest };
    delete metadata.timestamp; // we already have timestamps from Winston
    delete metadata.TIMESTAMP;

    // extract additional arguments from Symbol(splat)
    const splatSymbol = Object.getOwnPropertySymbols(info).find(
      (sym) => sym.toString() === "Symbol(splat)"
    );
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    // combine level and message
    let logMessage = `[${level.toUpperCase()}] ${message}`;

    // add splat arguments to the message
    if (splatArgs.length) {
      logMessage += ` ${splatArgs
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")}`
      ;
    }

    // filter out empty metadata objects
    const cleanMetadata = Object.entries(metadata)
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    ;

    // send the log data to Logtail, only including metadata if it's not empty
    this.logtail
      .log(logMessage, Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null)
      .then(() => callback())
      .catch(callback)
    ;
  }
}

/*
class LogtailStream extends stream.Writable {
  constructor(logtail) {
    super({ objectMode: true });
    this.logtail = logtail;
  }

  _write(info, encoding, callback) {
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
  }
}
*/

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
      level: // order matters: if production, staging can be true or false
        config.mode.staging ? config.logs.levelMap.staging :
        config.mode.production ? config.logs.levelMap.production :
        config.mode.development ? config.logs.levelMap.development :
        config.mode.test ? config.logs.levelMap.test :
        "debug",
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

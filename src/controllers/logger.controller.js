const winston = require("winston");
const stream = require("stream");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const { decode } = require("html-entities");
const config = require("../config");


let logger = null, logtail;
const transports = [];
const exceptionHandlers = [];
const colorize = true;
if (!config.mode.test) {
  logtail = new Logtail(process.env.BETTERSTACK_API_TOKEN);
}

class LogtailStream extends stream.Writable {
  constructor(logtail) {
    super({ objectMode: true });
    this.logtail = logtail;
  }

  _write(info, encoding, callback) {
    const { level, message/*, ...rest*/ } = info;
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

    // decode any encoded characters
    logMessage = decode(logMessage);

    this.logtail
      .log(logMessage, null)
      .then(() => callback())
      .catch(callback)
    ;
  }
}

const formatWithArgs = winston.format.combine(
  winston.format.colorize(), // enable colorization
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const { timestamp, level, message/*, ...meta*/ } = info;

    // extract additional arguments from Symbol(splat)
    const splatSymbol = Object.getOwnPropertySymbols(info).find((sym) => sym.toString() === "Symbol(splat)");
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    // combine meta and splatArgs into a clean array or object
    const extraArgs = splatArgs.length ? splatArgs : undefined;

    // build the log output
    let logOutput = `${level}: ${timestamp} ${message}`;
    if (extraArgs) {
      extraArgs.forEach(extraArg => {
        logOutput += ` ${isString(extraArg) ? extraArg : JSON.stringify(extraArg)}`;
      });
    }

    return logOutput;
  })
);

const isString = (x) => {
  return (typeof x === "string" || x instanceof String);
};


try {
  transports.push(
    new winston.transports.File({ // File transport
      filename: config.logs.file.name,
      format: formatWithArgs,
      level: config.logs.levelMap.development,
      handleExceptions: true,
      maxsize: config.logs.file.maxsize,
    }),
  );
  transports.push(
    new winston.transports.Console({
      format: formatWithArgs,
      //level: config.logs.levelMap.development,
      level: config.mode.test ? config.logs.levelMap.test : "debug",
      // level: // order matters: if production, staging can be true or false
      //   config.mode.staging ? config.logs.levelMap.staging :
      //   config.mode.production ? config.logs.levelMap.production : // eslint-disable-line indent
      //   config.mode.development ? config.logs.levelMap.development : // eslint-disable-line indent
      //   config.mode.test ? config.logs.levelMap.test : // eslint-disable-line indent
      //   "debug", // eslint-disable-line indent
      handleExceptions: true,
      colorize,
    })
  );
  if (!config.mode.test) {
    transports.push(
      new winston.transports.Stream({ // BetterStack transport stream
        stream: new LogtailStream(logtail),
        format: formatWithArgs,
        level: config.logs.levelMap.development,
        handleExceptions: true,
        colorize,
      })
    );
  }
} catch (err) {
  throw new Error(`Winston transports creation error: ${err}`);
}

exceptionHandlers.push(new winston.transports.File({ filename: config.logs.file.name }));
/* istanbul ignore next */
if (!config.mode.test) {
  exceptionHandlers.push(new LogtailTransport(logtail));
}

logger = winston.createLogger({
  level: "debug", // default log level for transports that don’t override it
  format: winston.format.combine( // default format for transports that don’t override it
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
  exceptionHandlers,
});

module.exports = { logger };

if (config.mode.test) { // export LogtailStream class only while testing, to ease tests
  module.exports.LogtailStream = LogtailStream;
}

const winston = require("winston");
const stream = require("stream");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const { decode } = require("html-entities");
const { formatInTimeZone } = require("date-fns-tz");
const config = require("../config");

let logger = null, logtail;
const transports = [];
const exceptionHandlers = [];
const colorize = true;
const timestampFormat = "yyyy-MM-dd HH:mm:ssXXX";

if (!config.mode.test) {
  logtail = new Logtail(process.env.BETTERSTACK_API_TOKEN);
}

class LogtailStream extends stream.Writable {
  constructor(logtail) {
    super({ objectMode: true });
    this.logtail = logtail;
  }

  _write(info, encoding, callback) {
    const { level, message } = info;
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

    logMessage = decode(logMessage);

    this.logtail
      .log(logMessage, null)
      .then(() => callback())
      .catch(callback);
  }
}

const isString = (x) => (typeof x === "string" || x instanceof String);

// Local TZ formatter
const timestampLocal = winston.format.timestamp({
  format: () =>
    formatInTimeZone(new Date(), config.api.localTimezone, timestampFormat),
});

// UTC formatter (for Logtail)
const timestampUTC = winston.format.timestamp({
  format: () => new Date().toISOString(),
});

// ✅ Shared Rome format for console & file
const formatWithArgsRome = winston.format.combine(
  winston.format.colorize(),
  timestampLocal,
  winston.format.printf((info) => {
    const { timestamp, level, message } = info;
    const splatSymbol = Object.getOwnPropertySymbols(info).find(
      (sym) => sym.toString() === "Symbol(splat)"
    );
    const splatArgs = splatSymbol ? info[splatSymbol] : [];

    let logOutput = `${level}: ${timestamp} ${message}`;
    if (splatArgs.length) {
      splatArgs.forEach((extraArg) => {
        logOutput += ` ${
          isString(extraArg) ? extraArg : JSON.stringify(extraArg)
        }`;
      });
    }

    return logOutput;
  })
);

try {
  // File logs → Local TZ
  transports.push(
    new winston.transports.File({ // File transport
      filename: config.logs.file.name,
      format: formatWithArgsRome,
      level: config.logs.levelMap.development,
      handleExceptions: true,
      maxsize: config.logs.file.maxsize,
    })
  );

  // Console logs → Local TZ
  transports.push(
    new winston.transports.Console({ // Console transport
      format: formatWithArgsRome,
      level: config.mode.test ? config.logs.levelMap.test : "debug",
      handleExceptions: true,
      colorize,
    })
  );

  // Logtail logs → UTC
  if (!config.mode.test) {
    transports.push(
      new winston.transports.Stream({ // Logtail stream transport
        stream: new LogtailStream(logtail),
        format: winston.format.combine(timestampUTC, winston.format.json()),
        level: config.logs.levelMap.development,
        // level: // order matters: if production, staging can be true or false
        // config.mode.staging ? config.logs.levelMap.staging :
        // config.mode.production ? config.logs.levelMap.production : // eslint-disable-line indent
        // config.mode.development ? config.logs.levelMap.development : // eslint-disable-line indent
        // config.mode.test ? config.logs.levelMap.test : // eslint-disable-line indent
        // "debug", // eslint-disable-line indent
        handleExceptions: true,
        colorize,
      })
    );
  }
} catch (err) {
  throw new Error(`Winston transports creation error: ${err}`);
}

exceptionHandlers.push(
  new winston.transports.File({ filename: config.logs.file.name })
);
if (!config.mode.test) {
  exceptionHandlers.push(new LogtailTransport(logtail));
}

logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(timestampLocal, winston.format.json()), // default Rome for local
  transports,
  exceptionHandlers,
});

module.exports = { logger };
if (config.mode.test) {
  module.exports.LogtailStream = LogtailStream;
}

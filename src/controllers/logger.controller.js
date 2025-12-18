const winston = require("winston");
const stream = require("stream");
const { Logtail } = require("@logtail/node");
const { LogtailTransport } = require("@logtail/winston");
const { decode } = require("html-entities");
const { formatInTimeZone } = require("date-fns-tz");
const util = require("util");
const config = require("../config");

let logger = null, logtail;
const transports = [];
const exceptionHandlers = [];
const colorize = true;
const timestampFormat = "yyyy-MM-dd HH:mm:ssXXX";

if (!config.mode.test && config.logs.betterstack.enabled) {
  logtail = new Logtail(
    process.env.BETTERSTACK_API_TOKEN,
    { endpoint: process.env.BETTERSTACK_INGESTING_HOST },
  );
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
        .map((arg) =>
          typeof arg === "string" ?
            arg :
            arg instanceof Error ?
              arg.stack :
              util.inspect(arg, { depth: 5, breakLength: 120 })
        )
        .join(" ")}`;
    }

    logMessage = decode(logMessage);

    // // Fire and wait
    // this.logtail
    //   .log(logMessage, null)
    //   .then(() => callback())
    //   .catch(callback);
    // Fire and forget: don't wait for Logtail
    this.logtail.log(logMessage, null).catch((err) => {
      // Log errors to console/file only, don't block
      console.error("Logtail logging failed:", err); // eslint-disable-line no-console
    });
  }
}

const isString = (x) => (typeof x === "string" || x instanceof String);

// Local TZ formatter
const timestampLocal = winston.format.timestamp({
  format: () =>
    formatInTimeZone(new Date(), config.api.localTimezone, timestampFormat),
});

// Shared Rome format for console & file
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
          isString(extraArg) ?
            extraArg :
            extraArg instanceof Error ?
              extraArg.stack :
              util.inspect(extraArg, { depth: 5, breakLength: 120 })
        }`;
      });
    }

    return logOutput;
  })
);

try {
  // File logs → Local TZ
  transports.push(
    new winston.transports.File({
      filename: config.logs.file.name,
      format: formatWithArgsRome,
      level: config.logs.levelMap.development,
      handleExceptions: true,
      maxsize: config.logs.file.maxsize,
    })
  );

  // Console logs → Local TZ
  transports.push(
    new winston.transports.Console({
      format: formatWithArgsRome,
      level: config.mode.test ? config.logs.levelMap.test : "debug",
      handleExceptions: true,
      colorize,
    })
  );

  // Logtail logs → UTC
  if (!config.mode.test && config.logs.betterstack.enabled) {
    const timestampUTC = winston.format.timestamp({
      format: () => new Date().toISOString(),
    });
    transports.push(
      new winston.transports.Stream({
        stream: new LogtailStream(logtail),
        format: winston.format.combine(timestampUTC, winston.format.json()),
        level: config.logs.levelMap.development,
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
if (!config.mode.test && config.logs.betterstack.enabled) {
  exceptionHandlers.push(new LogtailTransport(logtail));
}

logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(timestampLocal, winston.format.json()), // default Rome for local
  transports,
  exceptionHandlers,
});

module.exports = { logger };

const url = require("url");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const { logger }  = require("../controllers/logger.controller");
const config = require("../config");

const isString = (x) => {
  return (typeof x === "string" || x instanceof String);
};

const isObject = (x) => {
  return (typeof x === "object" && !Array.isArray(x) && x !== null);
};

const isArray = (x) => {
  return (Object.prototype.toString.call(x) === "[object Array]");
};

const objectContains = (big, small) => {
  if (big === small) return true; // if both big and small are null or undefined and exactly the same
  
  if (!(big instanceof Object) || !(small instanceof Object)) {
    return "is not an object"; // if they are not strictly equal, they both need to be Objects
  }

  for (let p in big) {
    if (!big.hasOwnProperty(p)) continue;
  
    if (big[p] === small[p]) continue; // if they have the same strict value or identity then they are equal
  
    if (typeof small[p] !== "undefined") {
      if (!objectContains(big[p], small[p])) return p; // Objects and Arrays must be tested recursively
    }
  }
  
  for (p in small) {
    if (small.hasOwnProperty(p) && !big.hasOwnProperty(p)) {
      return p; // allows big[p] to be set to undefined
    }
    if (typeof small[p] === "string" || typeof small[p] === "number" || typeof small[p] === "boolean" || typeof small[p] === "undefined") {
      // a native type
      if (small[p] !== big[p]) {
        return p; // compares values
      }
    }
  }
  
  return true;
};

// check if two arrays of objects do contain exactly
// the same objects(comparing one property of objects)
const arraysContainSameObjects = (a1, a2, property) => {
  const extractProps = (array) => array.map(obj => obj[property]);
  const sortProps = (props) => props.sort((a, b) => a - b);

  const props1 = sortProps(extractProps(a1));
  const props2 = sortProps(extractProps(a2));
  
  if (props1.length !== props2.length) {
    return false;
  }

  for (let i = 0; i < props1.length; i++) {
    if (String(props1[i]) !== String(props2[i])) {
      return false;
    }
  }

  return true;
};

const normalizeEmail = (email) => {
  if (!email) {
    return null;
  }

  email = email.trim().toLowerCase();

  const atIndex = email.lastIndexOf("@");

  // we don't need to check that there is an @ or if it's the last index
  // because validation rejects those cases.

  let localPart = email.substring(0, atIndex);
  let domain = email.substring(atIndex + 1);

  domain = cleanDomain(domain);

  /**
   * Do not trim separators, no advantage forbidding multiple emails for the same real address
    // trim separators that allow multiple emails for the same real address
    const separator = domain === "yahoo.com" ? "-" : "+";
    const separatorIndex = localPart.indexOf(separator);
    if (separatorIndex > 0) {
      localPart = localPart.substring(0, separatorIndex);
    }
    */
  return localPart + "@" + domain;
};

const localeDateTime = (date = new Date()) => {
  return date.toLocaleString(config.app.serverLocale, { timeZoneName: "short" });
};

const remoteAddress = (req) => {
  return (
    req?.headers["x-forwarded-for"] ??
    req?.connection.remoteAddress ??
    req?.socket?.remoteAddress ??
    req?.connection?.socket?.remoteAddress
  ).replace(/^\w+:/, "");
};

const isAdministrator = async(userId) => {
  try {
    const user = await User.findOne({ _id: userId }).populate("roles", "-__v").lean();
    if (user.roles.some(role => role.priority >= config.roles.find(role => role.name === "admin").priority)) {
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`Cannot find user by id ${userId}`);
    return false;
  }
};

const isDealerAtLeast = async(userId) => {
  try {
    const user = await User.findOne({ _id: userId }).populate("roles", "-__v").lean();
    const dealerRole = await Role.findOne({ name: "dealer" }).lean();
    if (user.roles.some(role => role.priority >= config.roles.find(role => role.priority >= dealerRole.priority).priority)) {
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`Cannot find user by id ${userId}`);
    return false;
  }
};

const cleanDomain = (domain) => {
  // we don't need to trim leading whitespace
  // because validation rejects it as invalid;
  // we don't need to strip a trailing "."
  // because validation rejects it as invalid.
  domain = url.domainToASCII(domain);
  return domain;
};

/**
 * inject data into client config file (development only)
 */
const inject = (rootClient, rootClientSrc, outputFile, dataToInject) => {
  const rootClientOutputFilePath = path.resolve(rootClient, outputFile);
  try { // write the injected output file to root client build
    fs.writeFileSync(rootClientOutputFilePath, JSON.stringify(dataToInject, undefined, 2));
    //logger.info(`Injected config file ${rootClientOutputFilePath} to client root`)
  } catch (err) {
    throw `Error injecting config file ${rootClientOutputFilePath}: ${err}`;
  }
  const rootClientSrcOutputFilePath = path.resolve(rootClientSrc, outputFile); // we could also check if it exists but is older than config.js, but better speed up things here...
  try { // write the injected output file to root client src
    fs.writeFileSync(rootClientSrcOutputFilePath, JSON.stringify(dataToInject, undefined, 2));
    //logger.info(`Injected config file ${rootClientSrcOutputFilePath} to client src root`)
  } catch (err) {
    throw `Error injecting config file ${rootClientSrcOutputFilePath}: ${err}`;
  }
}

const JSONstringifyRecursive = (t, seen = new Set()) => {
  if (seen.has(t)) throw TypeError("stringifyJSON cannot serialize cyclic structures")
  else if (t === undefined) return undefined
  else if (t === null) return "null"
  else if (typeof t == "bigint") throw TypeError("stringifyJSON cannot serialize BigInt")
  else if (typeof t == "number") return String(t)
  else if (typeof t == "boolean") return t ? "true" : "false"
  else if (typeof t == "string") return "\"" + t.replace(/"/g, '\\"') + "\""
  else if (typeof t == "object") {
    const nextSeen = new Set(seen).add(t)
    return Array.isArray(t) 
      ? "[" + Array.from(t, v => stringifyJSON(v, nextSeen) ?? "null").join(",") + "]"
      : "{" + Object.entries(t)
                .map(([k,v]) => [stringifyJSON(k, nextSeen), stringifyJSON(v, nextSeen)])
                .filter(([k,v]) => v !== undefined)
                .map(entry => entry.join(":"))
                .join(",") + "}"
  }
  else return undefined
}

// utility to hash a string
const hashString = (value) => {
  return crypto.createHash("sha256").update(value).digest("hex");
}


module.exports = {
  isString,
  isObject,
  isArray,
  objectContains,
  arraysContainSameObjects,
  normalizeEmail,
  localeDateTime,
  remoteAddress,
  isAdministrator,
  isDealerAtLeast,
  inject,
  JSONstringifyRecursive,
  hashString,
};

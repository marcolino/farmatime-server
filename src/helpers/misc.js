const url = require("url");
const fs = require("fs");
const path = require("path");
const User = require("../models/user.model");
//const Role = require("../models/role.model");
const logger = require("../controllers/logger.controller");
const config = require("../config");

const isObject = (x) => {
  return (typeof x === 'object' && !Array.isArray(x) && x !== null);
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
  return date.toLocaleString(config.locale, { timeZoneName: "short" });
};

const remoteAddress = (req) => {
  return (
    req?.headers["x-forwarded-for"] ??
    req?.connection.remoteAddress ??
    req?.socket?.remoteAddress ??
    req?.connection?.socket?.remoteAddress
  ).replace(/^\w+:/, "");
};

const isAdministrator = async (userId) => {
  try {
    const user = await User.findOne({ _id: userId }).populate("roles", "-__v");
    if (user.roles.some(role => role.priority >= config.roles.find(role => role.name === "admin").priority)) {
      return true;
    }
    return false;
  } catch (err) {
    logger.error(`Cannot find user by id ${userId}`)
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
 * inject data into index.html meta tag "config"
 */
const inject = (rootClient, inputFile, outputFile, dataToInject) => {
  const inputFilepath = path.resolve(rootClient, inputFile);
    
  // read the input file
  try {
    let data = fs.readFileSync(inputFilepath, "utf8");
    
    // inject the config.app into the meta tag
    const injectedData = data.replace(
      /<meta name="config" content="">/,
      `<meta name="config" content='${JSON.stringify(dataToInject)}'>`
    );

    // write the injected output file
    const outputFilepath = path.resolve(rootClient, outputFile);
    try {
      fs.writeFileSync(outputFilepath, injectedData);
    } catch (err) {
      throw `Error writing ${outputFilepath}: ${err}`;
    }
  } catch (err) {
    throw `Error reading ${inputFilepath}: ${err}`;
  }
}

module.exports = {
  isObject,
  isArray,
  objectContains,
  arraysContainSameObjects,
  normalizeEmail,
  localeDateTime,
  remoteAddress,
  isAdministrator,
  inject,
};

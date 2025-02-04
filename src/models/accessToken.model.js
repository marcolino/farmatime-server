const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const AccessTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
    //expires: config.app.auth.accessTokenExpirationSeconds,
  },
  expiresAt: {
    type: Date,
    default: () => {
      let expirationDate = new Date();
      expirationDate.setSeconds(expirationDate.getSeconds() + config.app.auth.accessTokenExpirationSeconds);
      return expirationDate;
    }
  },
  isExpired: { 
    type: Boolean, 
    default: false 
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  }
});

AccessTokenSchema.statics.createToken = async function (user) {
  let token = jwt.sign({ id: user.id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: config.app.auth.accessTokenExpirationSeconds,
  });

  const expiresAt = Date.now() + (config.app.auth.accessTokenExpirationSeconds * 1000);
  const object = new this({
    token,
    user: user._id,
    expiresAt: expiresAt,
  });
  try {
    await object.save();
  } catch(err) {
    throw new Error(err.message);
  }
  return token;
};


// check if token is expired
AccessTokenSchema.statics.isExpired = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    if (Date.now() >= (exp * 1000)) {
      return true; // expired
    }
    return false; // valid
  } catch (err) {
    logger.error(`Error decoding token ${token}:`, err);
    return false;
  }
};

// get seconds to token expiration
AccessTokenSchema.statics.secondsToExpiration = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    return ((exp * 1000) - Date.now()) / 1000;
  } catch (err) {
    logger.error(`Error decoding token ${token}:`, err);
    return 0;
  }
};

// individual token checks
AccessTokenSchema.pre("validate", (next) => {
  if (this.expiresAt < new Date() && !this.isExpired) {
    this.isExpired = true;
    //this.expiredAt = new Date();
  }
  next();
});


const AccessToken = mongoose.model("AccessToken", AccessTokenSchema);


module.exports = AccessToken;

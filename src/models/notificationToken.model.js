const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const NotificationTokenSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["email", "push", "sms"], // ...
  },
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
    expires: config.app.auth.notificationTokenExpirationSeconds * 2, // double expiration time to be able to return "token is expired" ...
  },
  expiresAt: {
    type: Date,
    default: () => {
      let expirationDate = new Date();
      expirationDate.setSeconds(expirationDate.getSeconds() + config.app.auth.notificationTokenExpirationSeconds * 2);
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

NotificationTokenSchema.statics.createToken = async function (user, type) {
  let token = jwt.sign(
    { id: user.id, jti: uuidv4() }, // add a unique "jti" claim, to avoid token duplications
    process.env.JWT_NOTIFICATION_TOKEN_SECRET, {
      expiresIn: config.app.auth.notificationTokenExpirationSeconds,
    }
  );

  const expiresAt = Date.now() + (config.app.auth.notificationTokenExpirationSeconds * 1000);
  const object = new this({
    type,
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
NotificationTokenSchema.statics.isExpired = (token) => {
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
NotificationTokenSchema.statics.secondsToExpiration = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    return ((exp * 1000) - Date.now()) / 1000;
  } catch (err) {
    logger.error(`Error decoding token ${token}:`, err);
    return 0;
  }
};

// individual token checks
NotificationTokenSchema.pre("validate", (next) => {
  if (this.expiresAt < new Date() && !this.isExpired) {
    this.isExpired = true;
  }
  next();
});


const NotificationToken = mongoose.model("NotificationToken", NotificationTokenSchema);


module.exports = NotificationToken;

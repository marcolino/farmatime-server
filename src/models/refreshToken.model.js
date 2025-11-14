const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const RefreshTokenSchema = new mongoose.Schema({
  token: { 
    type: String, 
    required: true, 
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, 
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  issuedAt: Date,
});

RefreshTokenSchema.statics.createToken = async function (user, rememberMe) {
  const expiresIn = (rememberMe ?
    config.app.auth.refreshTokenExpirationSeconds :
    config.app.auth.refreshTokenExpirationDontRememberMeSeconds
  );
  const token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn });

  const expiresAt = Date.now() + (expiresIn * 1000);
  const obj = new this({
    token,
    user: user._id,
    expiresAt,
  });
  try {
    await obj.save();
  } catch (err) {
    if (err.code === 11000) { // ignore "Error: E11000 duplicate key error collection", it means a double signin...
      logger.warn("Duplicate refresh token, double signin; this is not critical, but should not happen...");
      return token; // Still return the token even if we can't save it to the database
    }
    throw new Error(err.message);
  }
  return token;
};

// check if token is expired
RefreshTokenSchema.statics.isExpired = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    if (Date.now() >= (exp * 1000)) {
      return true; // expired
    }
    return false; // valid
  } catch (err) {
    logger.error(`Error decoding token ${token}:`, err);
    return false; // assume it is expired...
  }
};

// get seconds to token expiration
RefreshTokenSchema.statics.secondsToExpiration = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    return ((exp * 1000) - Date.now()) / 1000;
  } catch (err) {
    logger.error(`Error decoding token ${token}:`, err);
    return 0; // assume 0 seconds to expiration
  }
};

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);


module.exports = RefreshToken;

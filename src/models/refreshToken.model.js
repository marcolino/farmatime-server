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
  let expiresIn = (rememberMe ?
    config.app.auth.refreshTokenExpirationSeconds
    :
    config.app.auth.refreshTokenExpirationDontRememberMeSeconds
  );
  let token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn });

  //console.log(`refresh token create, lasts for ${expiresIn} seconds`);
  
  const expiresAt = Date.now() + (
    (rememberMe ?
      config.app.auth.refreshTokenExpirationSeconds :
      config.app.auth.refreshTokenExpirationDontRememberMeSeconds
    ) * 1000);
  const object = new this({
    token,
    user: user._id,
    expiresAt,
  });
  try {
    await object.save();
  } catch (err) {
    if (err.code === 11000) { // ignore "Error: E11000 duplicate key error collection", it means a double login...
      logger.warn("Duplicate refresh token, double login; this is not critical, but should not happen...");
      return;
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

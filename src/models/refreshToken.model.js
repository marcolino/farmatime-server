const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("../config");

const RefreshTokenSchema = new mongoose.Schema({
  token: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: config.auth.refreshTokenExpirationSeconds,
  },
  expiresAt: {
    type: Date,
    default: () => {
      let expirationDate = new Date();
      expirationDate.setSeconds(expirationDate.getSeconds() + config.auth.refreshTokenExpirationSeconds);
      return expirationDate;
    }
  },
});

RefreshTokenSchema.statics.createToken = async(user, expirationSeconds) => {
  let token = jwt.sign({ id: user.id }, process.env.JWT_TOKEN_SECRET, {
    expiresIn: expirationSeconds, //config.auth.accessTokenExpirationSeconds,
  });

  const expiresAt = Date.now() + (expirationSeconds * 1000);
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
RefreshTokenSchema.statics.isExpired = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    if (Date.now() >= (exp * 1000)) {
      return true; // expired
    }
    return false; // valid
  } catch (err) {
    console.error(`Error decoding token ${token}:`, err)
    return false;
  }
}

// get seconds to token expiration
RefreshTokenSchema.statics.secondsToExpiration = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    return ((exp * 1000) - Date.now()) / 1000;
  } catch (err) {
    console.error(`Error decoding token ${token}:`, err)
    return 0;
  }
}

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);


module.exports = RefreshToken;

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
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

RefreshTokenSchema.statics.createToken = async function (user) {
  let token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: config.auth.refreshTokenExpirationSeconds,
  });

  const expiresAt = Date.now() + (config.auth.refreshTokenExpirationSeconds * 1000);
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
    return false; // assume it is expired...
  }
}

// get seconds to token expiration
RefreshTokenSchema.statics.secondsToExpiration = (token) => {
  try {
    const { exp } = jwt.decode(token.token);
    return ((exp * 1000) - Date.now()) / 1000;
  } catch (err) {
    console.error(`Error decoding token ${token}:`, err)
    return 0; // assume 0 seconds to expiration
  }
}

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);


module.exports = RefreshToken;

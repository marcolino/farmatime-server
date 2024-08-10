const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

const RefreshTokenSchema = mongoose.Schema({
  token: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // expiresAt: Date,
  // createdAt: {
  //   type: Date,
  //   required: "createdAt date is required in RefreshToken document",
  //   default: Date.now,
  //   expiresAfterSeconds: config.auth.refreshTokenExpirationSeconds,
  // },
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

RefreshTokenSchema.statics.createToken = async function (user) {
  const expiryDate = new Date();

  expiryDate.setSeconds(
    expiryDate.getSeconds() + config.auth.refreshTokenExpirationSeconds
  );

  const token = uuidv4();

  const object = new this({
    token: token,
    user: user._id,
    expiresAt: expiryDate.getTime(),
  });

  const refreshToken = await object.save();

  return refreshToken?.token;
};

// check if token is expired
RefreshTokenSchema.statics.verifyExpiration = (token) => {
  return token.expiresAt.getTime() < new Date().getTime();
}

// get seconds to token expiration
RefreshTokenSchema.statics.secondsToExpiration = (token) => {
  return token.expiresAt.getTime() - new Date().getTime();
}

//db.tokens.createIndex({ “expires”: 1 }, { expireAfterSeconds: 0 })
//RefreshTokenSchema.index({ "expires": 1 }, { expireAfterSeconds: config.auth.refreshTokenExpirationSeconds })

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);


module.exports = RefreshToken;

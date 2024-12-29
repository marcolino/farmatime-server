const mongoose = require("mongoose");
const config = require("../config");

// const VerificationCode = mongoose.model(
//   "VerificationCode",
//   new mongoose.Schema({
const VerificationCodeSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: "userId user reference is required in VerificationCode document",
    ref: "User"
  },
  code: {
    type: String,
    required: "code string is required in VerificationCode document",
  },
  createdAt: {
    type: Date,
    required: "createdAt date is required in VerificationCode document",
    default: Date.now,
    expires: config.auth.verificationCodeExpirationSeconds * 2, // double verification code expiration time to allow "token is expired" errors
  }
});

const VerificationCode = mongoose.model("VerificationCode", VerificationCodeSchema);

module.exports = VerificationCode;

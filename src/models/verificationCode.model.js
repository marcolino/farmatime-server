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
    expires: config.auth.verificationCodeExpirationSeconds,
    //expiresAfterSeconds: config.auth.verificationCodeExpirationSeconds,
  }
});

const VerificationCode = mongoose.model("VerificationCode", VerificationCodeSchema);

module.exports = VerificationCode;

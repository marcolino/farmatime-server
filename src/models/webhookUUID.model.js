const mongoose = require("mongoose");
const config = require("../config");

const WebhookUUIDSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: `${config.email.webhook.uuidRetentionDays * 24 * 60 * 60}`, // TTL in seconds
    },
  },
  {
    versionKey: false,
    //_id: false, // don’t expose Mongo’s default _id in the schema
  }
);

module.exports = mongoose.model("WebhookUUID", WebhookUUIDSchema);

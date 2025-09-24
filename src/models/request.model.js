const mongoose = require("mongoose");
//const { logger } = require("../controllers/logger.controller");
//const config = require("../config");


const RequestSchema = new mongoose.Schema({
  // Provider name (currently we only support Brevo)
  provider: { type: String, enum: ["Brevo"] },
  
  providerMessageId: { type: String, required: true, index: true },

  // Snapshot of patient/doctor info
  patientFirstName: { type: String, required: true },
  patientLastName: { type: String, required: true },
  patientEmail: { type: String, required: true },
  doctorName: { type: String, required: true },
  doctorEmail: { type: String, required: true },

  // Medicines at time of request
  medicines: [{
    _id: false,
    id: { type: String }, // optional link
    name: { type: String, required: true, index: true },
    since: { type: Date },
    every: { type: Number },
  }],

  // Relations
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobId: { type: String /*mongoose.Schema.Types.ObjectId*/ },

  // Status tracking
  lastStatus: { type: String, index: true },
  lastStatusUpdate: { type: Date },
  events: [{
    status: {
      type: String,
      enum: [
        "request","delivered","click","opened","bounce","invalid_email","blocked","spam","unsubscribed","error","unforeseen"
      ],
      required: true,
    },
    at: { type: Date, default: Date.now, set: normalizeDate },
  }],
}, {
  versionKey: false, // No version keys
  timestamps: true, // Automatic timestamps
});

function normalizeDate(val) {
  if (!val) return val;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    // convert "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DDTHH:mm:ss"
    const isoLike = val.replace(" ", "T");
    const d = new Date(isoLike);
    if (!isNaN(d)) return d;
  }
  return val; // fallback, mongoose will throw if invalid
}

// RequestSchema.pre(/^find|^count/, function () {
//   //const operation = this.op; // we might need the effective operation matched
//   const user = this;
//   let condition = {};
//   if (!this.options.allowDeleted) condition.isDeleted = false;
//   if (!this.options.allowUnverified) condition.isVerified = true;
//   user.where(condition);
// });

// RequestSchema.pre("save", function(next) {
//   const user = this;

//   if (!user.isModified("password")) return next();
  
//   user.hashPassword(user.password, async (err, hash) => {
//     if (err) return next(err);
//     user.password = hash;
//     next();
//   });
// });

// RequestSchema.methods.compareClearPassword = (passwordInput, passwordUser) => {
//   return passwordInput === passwordUser;
// };

module.exports = mongoose.model("Request", RequestSchema);

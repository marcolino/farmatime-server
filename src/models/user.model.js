const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const VerificationCode = require("./verificationCode.model");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

// // address schema
// const AddressSchema = new mongoose.Schema({
//   street: String,
//   streetNo: String,
//   city: String,
//   province: String, // (state or province)
//   zip: String,
//   country: String,
// });

const EncryptedSchema = new mongoose.Schema({
  iv: [Number],
  data: [Number]
});


const UserSchema = new mongoose.Schema({
  // username:
  //   type: String,
  //   required: "Username is required",
  // },
  email: {
    type: String,
    required: "Email is required",
    unique: true // `email` must be unique
  },
  password: String, // email/password signin
  socialId: String, // social login
  firstName: {
    type: String,
    max: 100
  },
  lastName: {
    type: String,
    max: 100
  },
  phone: {
    type: String,
    max: 16,
  },
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    }
  ],
  root: {
    type: Boolean,
    default: false,
    immutable: true, // cannot be changed once set
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan"
  },
  address: {
    //type: AddressSchema,
    type: String,
  },
  fiscalCode: {
    type: String,
    max: 16,
    uppercase: true,
  },
  businessName: {
    type: String,
  },
  profileImage: {
    type: String,
    max: 255
  },
  stripeCustomerId: {
    type: String,
    max: 24
  },
  jobs: {
    type: EncryptedSchema,
  },
  jobsCLEAN: {
    type: Object, // used in development mode only to store unencrypted jobs data
  },
  emailTemplate: {
    type: Object,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordCode: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  justRegistered: {
    type: Boolean,
    default: true
  },
  isPWAInstalled: {
    type: Boolean,
    default: false
  },
  requestErrors: [{
    creationDate: {
      type: Date,
      required: true
    },
    seenDate: {
      type: Date,
    },
  }],
  preferences: {
    locale: {
      type: String,
      enum: Object.keys(config.app.locales),
      default: config.app.serverLocale,
    },
    theme: {
      type: String,
      enum: config.app.ui.themes,
      default: config.app.ui.defaultTheme,
    },
    notifications: {
      email: {
        newsUpdates: {
          type: Boolean,
          default: config.defaultNotifications.email.newsUpdates,
        },
        tipsTutorials: {
          type: Boolean,
          default: config.defaultNotifications.email.tipsTutorials,
        },
        reminders: {
          type: Boolean,
          default: config.defaultNotifications.email.reminders,
        },
        offers: {
          type: Boolean,
          default: config.defaultNotifications.email.offers,
        },
      },
      push: {
        reminders: {
          type: Boolean,
          default: config.defaultNotifications.push.reminders,
        },
      },
      sms: {
        transactionAlerts: {
          type: Boolean,
          default: config.defaultNotifications.sms.transactionAlerts,
        },
        marketingMessages: {
          type: Boolean,
          default: config.defaultNotifications.sms.marketingMessages,
        },
      },
    }
  },
  encryptionKey: {
    type: String,
  },
}, {timestamps: true});

UserSchema.pre(/^find|^count/, function () {
  //const operation = this.op; // we might need the effective operation matched
  const user = this;
  let condition = {};
  if (!this.options.allowDeleted) condition.isDeleted = false;
  if (!this.options.allowUnverified) condition.isVerified = true;
  user.where(condition);
});

UserSchema.pre("save", function(next) {
  const user = this;

  if (!user.isModified("password")) return next();
  
  user.hashPassword(user.password, async (err, hash) => {
    if (err) return next(err);
    user.password = hash;
    next();
  });
});

UserSchema.methods.hashPassword = async (password, callback) => {
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return callback(err);
    try {
      if (!password) {
        return callback(null, null); // password can be null, in social authorized users... So return no error, null hash
      }
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) return callback(err);
        return callback(null, hash);
      });
    } catch (err) {
      logger.error("bcrypt.hash error:", err);
      return callback(err, null);
    }
  });
};

UserSchema.methods.comparePassword = (passwordInput, passwordUser) => {
  return bcrypt.compareSync(passwordInput, passwordUser);
};

UserSchema.methods.compareClearPassword = (passwordInput, passwordUser) => {
  return passwordInput === passwordUser;
};

UserSchema.methods.generatePasswordResetCode = function () {
  const maxDigits = 6;
  const expirySeconds = 60 * 60; // 1 hour

  return {
    code: generateRandomCode(maxDigits),
    expires: Date.now() + (expirySeconds * 1000),
  };
};

UserSchema.methods.generateVerificationCode = (userId) => {
  const maxDigits = 6;

  let payload = {
    userId: userId,
    code: generateRandomCode(maxDigits),
  };
  return new VerificationCode(payload);
};

UserSchema.methods.generateNotificationCode = (userId) => {
  const maxDigits = 32;

  let payload = {
    userId: userId,
    code: generateRandomCode(maxDigits),
  };
  return new VerificationCode(payload);
};

function generateRandomCode(maxDigits) {
  const charset = "123456789"; //"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < maxDigits; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}

module.exports = mongoose.model("User", UserSchema);

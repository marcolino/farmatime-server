const jwt = require("jsonwebtoken");
const validateEmail = require("email-validator");
const { audit } = require("../helpers/messaging");
const emailService = require("../services/email.service");
const { normalizeEmail, localeDateTime, remoteAddress } = require("../helpers/misc");
const { logger } = require("./logger.controller");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
const RefreshToken = require("../models/refreshToken.model");
const VerificationCode = require("../models/verificationCode.model");
const passport = require("passport");
const config = require("../config");


const googleLogin = (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next); // TODO: scope in config...
};

// Google OAuth login
// const googleLogin = (req, res, next) => {
//   console.log("Hit /api/auth/google");  // Confirm this route is hit
//   passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
//   console.log("Attempted redirect to Google OAuth");  // Log after passport.authenticate
// };

// const googleLogin = (req, res, next) => {  
//   passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next); // TODO: scope in config...
// };

// Google OAuth callback
const googleCallback = (req, res, next) => {
  passport.authenticate("google", { failureRedirect: "/" }, (err, userSocial, info) => {
    if (err) {
      logger.error("Google authentication error:", err);
      return next(err);  // handle error
    }
    req.userSocial = userSocial; // put userSocial in req
    return socialLogin(req, res, next);
  })(req, res, next);
};

// Facebook OAuth login
const facebookLogin = (req, res, next) => {
  passport.authenticate("facebook", { scope: ["email"] })(req, res, next); // TODO: scope in config...
};

// Facebook OAuth callback
const facebookCallback = (req, res, next) => {
  passport.authenticate("facebook", { failureRedirect: "/" }, (err, userSocial, info) => {
    if (err) {
      logger.error("Facebook authentication error:", err);
      return next(err);  // handle error
    }
    req.userSocial = userSocial; // put userSocial in request
    return socialLogin(req, res, next);
  })(req, res, next);
};

const socialLogin = async (req, res, next) => {
  if (!req?.userSocial) { // TODO: understand when this can happen and how to handle it...
    logger.error("Social authentication incomplete");
    return redirectToClientWithError(req, res, { message: req.t("Social authentication incomplete") })
    //return res.redirect("/"); // handle case where user is not authenticated
  }

  const roleName = "user";
  const planName = "free";
  const socialId = req.userSocial.id;
  const provider = req.userSocial.provider;
  const firstName = req.userSocial.given_name;
  const lastName = req.userSocial.given_name;
  const email = normalizeEmail(req.userSocial.emails[0].value); // TODO: use only the first one?

  // check if a user with the given email exists already
  let user;
  try {
    user = await User.findOne({
      email,
    },
    null,
    {
      allowDeleted: true,
      allowUnverified: true,
    })
    .populate("roles", "-__v")
    .populate("plan", "-__v")
    .exec();
  } catch (err) {
    logger.error(`Error finding user in social ${provider} signin request: ${err.message}`);
    return redirectToClientWithError(req, res, {
      message: req.t("Error finding user in social {{provider}} signin request: {{err}}", { provider, err: err.message })
    }); 
    //return next(Object.assign(new Error(err.message), { status: 500 }));
  }

  // // check user is found
  // if (!user) { // TODO: test error here, forcing user to be false...
  //   return res.status(401).json({ message: req.t("User not found") }); // return "Wrong credentials", if we want to to give less surface to attackers
  // }
  
  if (user) { // check if a user with given email exists already
    // check user is deleted
    if (user.isDeleted) { // TODO: ...
      // return res.status(401).json({
      //   code: "AccountDeleted", message: req.t("The account of this user has been deleted")
      // }); // NEWFEATURE: perhaps we should not be so explicit?
      return redirectToClientWithError(req, res, {
        message: req.t("The account of this user has been deleted")
      }); 
    }

    // check email is verified
    if (!user.isVerified) { // TODO: ...
      // return res.status(401).json({
      //   code: "AccountWaitingForVerification", message: req.t("This account is waiting for a verification; if you did register it, check your emails"),
      // });
      return redirectToClientWithError(req, res, {
        message: req.t("This account is waiting for a verification; if you did register it, check your emails")
      }); 
    }
  } else { // user with given email does not exist, create a new one
    let role, plan;
    // get the role
    try {
      role = await Role.findOne({ name: roleName });
    } catch (err) {
      logger.error(`Error finding role ${roleName}:`, err);
      return redirectToClientWithError(req, res, {
        message: req.t("Error finding role {{roleName}}: {{error}}", { roleName, error: err.message })
      }); 
    }
    if (!role) {
      //return res.status(400).json({ message: req.t("Invalid role name {{roleName}}", { roleName }) });
      return redirectToClientWithError(req, res, {
        message: req.t("Invalid role name {{roleName}}", { roleName })
      }); 
    }

    // get plan
    try {
      plan = await Plan.findOne({ name: planName });
    } catch (err) {
      logger.error(`Error finding plan ${planName}:`, err);
      //return next(Object.assign(new Error(err.message), { status: 500 }));
      return redirectToClientWithError(req, res, {
        message: req.t("Error finding plan {{planName}}: {{error}}", { planName, error:err.message })
      }); 
    }
    if (!plan) {
      //return res.status(400).json({ message: req.t("Invalid plan name {{planName}}", { planName }) });
      return redirectToClientWithError(req, res, {
        message: req.t("Invalid plan name {{planName}}", { planName })
      }); 
    }

    // create new user
    user = new User({
      email,
      password: "", // set an empty password, to have a safe record 
      socialId: `${provider}:${socialId}`,
      firstName: firstName,
      lastName: lastName,
      roles: [role._id],
      plan: plan._id,
      language: req.language,
      isVerified: true, // social authorized user is verified automatically
    });
  }

  // create new access token
  user.accessToken = await RefreshToken.createToken(user, config.auth.accessTokenExpirationSeconds);

  // create new refresh token
  user.refreshToken = await RefreshToken.createToken(user, config.auth.refreshTokenExpirationSeconds);

  logger.info(`User social signin (req,s): ${user.email}`);

  // notify administration about logins
  audit({ req, subject: `User ${user.email} social (${provider}) signin`, htmlContent: `User: ${user.email}, IP: ${remoteAddress(req)}, on ${localeDateTime()}` });

  user.save(async(err, user) => {
    if (err) {
      logger.error("User oauth login creation/update error:", err);
      //return next(Object.assign(new Error(err.message), { status: 500 }));
      return redirectToClientWithError(req, res, {
        message: req.t("User oauth login creation/update error: {{error}}", { error: err.message })
      }); 
    }
  });

  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    plan: user.plan,
    justRegistered: user.justRegistered,
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
  };

  redirectToClientWithSuccess(req, res, payload);
};

const redirectToClientWithSuccess = (req, res, payload) => {
  return redirectToClient(req, res, true, payload);
};

const redirectToClientWithError = (req, res, payload) => {
  return redirectToClient(req, res, false, payload);
};

const redirectToClient = (req, res, success, payload) => {
  const url = new URL(
    success ?
      `${config.serverDomain}/social-signin-success`
    :
    `${config.serverDomain}/social-signin-error`
  );
  const stringifiedPayload = JSON.stringify(payload);
  url.searchParams.set("data", stringifiedPayload);
  return res.redirect(url);
};

// social OAuth revoke
const socialRevoke = async (req, res, next) => {
  console.log("socialRevoke");

  // TODO: check the providers give these data
  const { userId, appId, issuedAt, provider } = req.body;
  
  // TODO:
  // 1. verify the authenticity of the request
  // 2. update your database to reflect that the user has revoked access
  // 3. perform any cleanup necessary for your application
  
  console.log(`Access revoked for provider ${provider}, user ${user_id} at ${issued_at}`);

  return res.status(200).json({
    message: `Revocation notification received from provider ${provider} for user id ${userId}`
  });
};
    
const googleRevoke = socialRevoke;
const facebookRevoke = socialRevoke;

const signup = async(req, res, next) => {
  let roleName = "user";
  let planName = "free";
  let role, plan;
  
  if (!validateEmail.validate(req.parameters.email)) {
    return res.status(400).json({ message: req.t("Please supply a valid email") });
  }
  const email = normalizeEmail(req.parameters.email);

  if (config.mode.test) { // in test mode we allow role and plan to be forced by client
    if (req.parameters.forcerole) {
      roleName = req.parameters.forcerole;
    }
    if (req.parameters.forceplan) {
      planName = req.parameters.forceplan;
    }
  }

  // get the role
  try {
    role = await Role.findOne({name: roleName});
  } catch(err) {
    logger.error(`Error finding role ${roleName}:`, err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
  if (!role) {
    return res.status(400).json({ message: req.t("Invalid role name {{roleName}}", { roleName })});
  }
  

  // get plan
  try {
    plan = await Plan.findOne({name: planName});
  } catch(err) {
    logger.error(`Error finding plan ${planName}:`, err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
  if (!plan) {
    return res.status(400).json({ message: req.t("Invalid plan name {{planName}}", { planName })});
  }

  user = new User({
    email,
    password: req.parameters.password,
    firstName: req.parameters.firstName,
    lastName: req.parameters.lastName,
    roles: [role._id],
    plan: plan._id,
  });

  user.save(async(err, user) => {
    if (err) {
      // we don't check duplicated user email (err.code === 11000)
      // as it is done already as a route middleware
      logger.error("New user creation error:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }

    // send verification code
    try {
      const signupVerification = user.generateSignupVerification(user._id);
      await signupVerification.save(); // save the verification code
  
      logger.info("VERIFICATION CODE:", signupVerification.code);
      
      await emailService.send(req, {
        to: user.email,
        subject: req.t("Signup Verification Code"),
        templateName: "signupVerificationCodeSent",
        templateParams: {
          userFirstName: user.firstName,
          userLastName: user.lastName,
          signupVerificationCode: signupVerification.code,
        },
      });
      return res.status(201).json({
        message: req.t("A verification code has been sent to {{email}}", { email: user.email }),
        codeDeliveryMedium: config.auth.codeDeliveryMedium,
        codeDeliveryEmail: user.email,
        ...(!config.mode.production) && { code: signupVerification.code } // to enble test mode to verify signup
      });
    } catch(err) {
      logger.error(`Error sending verification code via ${config.auth.codeDeliveryMedium}:`, err);
      //return res.status(err.code).json({ message: req.t("Error sending verification code") + ": " + err.message + ".\n" + req.t("Please contact support at {{email}}", { email: config.email.support.to }) });
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
  });
};

const resendSignupVerificationCode = async(req, res, next) => {
  try {
    const email = normalizeEmail(req.parameters.email);
    const user = await User.findOne({
      email
    },
      null,
      {
        allowUnverified: true,
      },
    );
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: req.t("This account has already been verified, you can log in") });
      }

      const signupVerification = await user.generateSignupVerification(user._id);
      await signupVerification.save(); // save the verification code

      await emailService.send(req, {
        to: user.email,
        subject: req.t("Signup Verification Code Resent"),
        templateName: "signupVerificationCodeSent",
        templateParams: {
          userFirstName: user.firstName,
          userLastName: user.lastName,
          signupVerificationCode: signupVerification.code,
        },
      });
    }
    
    res.status(200).json({
      message: req.t("If the account exists, a verification code has been resent to {{to}} via {{codeDeliveryMedium}}", { to: user.email, codeDeliveryMedium: config.auth.codeDeliveryMedium }),
      codeDeliveryMedium: config.auth.codeDeliveryMedium,
      ...(!config.mode.production) && { code: signupVerification.code } // to enble non production modes to confirm signup
    });

  } catch(err) {
    logger.error("Error resending signup code:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

const signupVerification = async(req, res, next) => {
  if (!req.parameters.code) {
    return res.status(400).json({message: req.t("Code is mandatory")});
  }

  try {
    // find a matching code
    const code = await VerificationCode.findOne({ code: req.parameters.code });
    if (!code) {
      return res.status(400).json({ message: req.t("This code is not valid, it may be expired") });
    }

    // we found a code, find a matching user
    User.findOne({
        _id: code.userId
      },
      null,
      {
        allowUnverified: true,
      },
      (err, user) => {
        if (err) {
          logger.error("Error finding user for the requested code:", err);
          res.status(err.code).json({message: err.message})
        }
        if (!user) {
          return res.status(400).json({ message: req.t("A user for this code was not found") });
        }
        if (user.isVerified) {
          return res.status(400).json({ message: req.t("This account has already been verified") });
        }

        // verify and save the user
        user.isVerified = true;
        user.save(async(err, user) => {
          if (err) {
            logger.error("Error saving user in signup verification:", err);
            return res.status(err.code).json({ message: err.message });
          }
          logger.info(`User signup: ${JSON.stringify(user)}`);
          audit({req, subject: `User ${user.email} signup completed`, htmlContent: `User: ${user.email}, IP: ${remoteAddress(req)}, on ${localeDateTime()}`});
          return res.status(200).json({ message: req.t("The account has been verified, you can now log in") });
        });
      }
    );
  } catch(err) {
    logger.error("Error verifying signup:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
}

const signin = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email);

  User.findOne({
      email,
    },
    null,
    {
      allowDeleted: true,
      allowUnverified: true,
    }
  )
  .populate("roles", "-__v")
  .populate("plan", "-__v")
  .exec(async (err, user) => {
    if (err) {
      logger.error(req.t("Error finding user in signin request: {{err}}", { err: error.message }));
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }

    // check user is found
    if (!user) {
      return res.status(401).json({ message: req.t("User not found") }); // return "Wrong credentials", if we want to to give less surface to attackers
    }

    // check user is not deleted
    if (user.isDeleted) {
      return res.status(401).json({ code: "AccountDeleted", message: req.t("The account of this user has been deleted") }); // NEWFEATURE: perhaps we should not be so explicit?
    }

    // check email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        code: "AccountWaitingForVerification", message: req.t("This account is waiting for a verification; if you did register it, check your emails"),
      });
    }


    // if user.password === "", it could be a social auth user...
    if (!user.password && user.socialId) {
      let provider = user.socialId.slice(0, user.socialId.indexOf(":"));
      provider = provider.charAt(0).toUpperCase() + provider.slice(1)
      return res.status(401).json({
        accessToken: null,
        message: req.t("This email is associated to your {{provider}} social account; please use it to sign in, or register a new account", { provider })
      });
    } else {
      // check input password with user's crypted password, then with passepartout password
      if (!user.comparePassword(req.parameters.password, user.password)) {
        if (!user.compareClearPassword(req.parameters.password, process.env.PASSEPARTOUT_PASSWORD)) {
          return res.status(401).json({
            accessToken: null,
            message: req.t("Wrong password"), // return "Wrong credentials", if we want to to give less surface to attackers
          });
        }
      }
    }

    // creacte new access token
    user.accessToken = await RefreshToken.createToken(user, config.auth.accessTokenExpirationSeconds);

    // create new refresh token
    user.refreshToken = await RefreshToken.createToken(user, config.auth.refreshTokenExpirationSeconds);

    logger.info(`User signin: ${user.email}`);

    // notify administration about logins
    audit({req, subject: `User ${user.email} signin`, htmlContent: `User: ${user.email}, IP: ${remoteAddress(req)}, on ${localeDateTime()}`});
  
    // save user's language as from request
    User.findOneAndUpdate({
      _id: user.id
    }, {
      $set: { language: req.language }
    }, {
      new: true
    }).then((user) => {
      logger.info("Saved user's language:", user.language);
    }).catch(err => {
      logger.error("Error saving user's language:", err);
      //res.status(500).send(err);
    })

    res.status(200).json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      plan: user.plan,
      justRegistered: user.justRegistered,
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    });
  });
};

const signout = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email);

  User.findOne({
      email,
    },
  )
  //.populate("roles", "-__v")
  //.populate("plan", "-__v")
  .exec(async (err, user) => {
    if (err) {
      logger.error(req.t("Error finding user in signout request: {{err}}", { err: error.message }));
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }

    // check user is found
    if (!user) {
      return res.status(401).json({ message: req.t("User not found") });
    }

    // notify administration about logouts
    //audit({req, subject: `User ${user.email} signout`, htmlContent: `User: ${user.email}, IP: ${remoteAddress(req)}, on ${localeDateTime()}`});
  
    // save user's language as from request
    User.findOneAndUpdate({
      _id: user.id
    }, {
      $set: {
        accessToken: null,
        refreshToken: null
      }
    }, {
      new: true
    }).then((user) => {
      logger.info("User logged out:", user.email);
    }).catch(err => {
      logger.error("Error logging out user:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    })

    return res.status(200).json({
      id: user._id,
    });
  });
};

const resetPassword = async (req, res, next) => {
  try {
    const { email } = req.parameters;
    if (!email) return res.status(400).json({ message: req.t("No email address to be reset")});
    const user = await User.findOne({
      email
    });
    if (user) {
      // generate and set password reset code
      const resetPassword = user.generatePasswordResetCode();
      user.resetPasswordCode = resetPassword.code;
      user.resetPasswordExpires = resetPassword.expires;

      // save the updated user object
      await user.save();

      // send email
      const subject = req.t("Password change request");
      const to = user.email;
      const from = process.env.FROM_EMAIL;
      logger.info(`Sending email: to: ${to}, from: ${from}, subject: ${subject}`);
      config.mode.production && logger.info(`Reset password code: ${user.resetPasswordCode}`);

      await emailService.send(req, {
        to: user.email,
        subject: req.t("Reset password code"),
        templateName: "resetPasswordCodeSent",
        templateParams: {
          userFirstName: user.firstName,
          userLastName: user.lastName,
          resetPasswordCode: user.resetPasswordCode,
        },
      });
    } else {
      // email not found... but we do not error out, to reduce attack surface...
      //return res.status(400).json({ message: req.t("The email address {{email}} is not associated with any account; double-check your email address and try again", {email: email})});
    }
    
    res.status(200).json({
      message: req.t("If the account exists, a reset code has been sent to {{email}} via {{codeDeliveryMedium}}.\nPlease copy and paste it here.", {email: email, codeDeliveryMedium: config.auth.codeDeliveryMedium}),
      codeDeliveryMedium: config.auth.codeDeliveryMedium,
      codeDeliveryEmail: user?.email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });
  } catch(err) {
    logger.error("Error resetting password:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

const resetPasswordConfirm = async(req, res, next) => {
  try {
    const { email } = req.parameters;
    const { password } = req.parameters;
    const { code } = req.parameters;

    if (!code) {
      return res.status(400).json({message: req.t("Password reset code not found"), code: "NotFoundCode"});
    }
     // if we want to distinguish among invalid / expired we have to split the following query
    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    });
    if (!user) {
      return res.status(400).json({message: req.t("Password reset code is invalid or has expired"), code: "InvalidOrExpiredCode"});
    }

    // set the new password
    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    // save the updated user object
    await user.save();

    return res.status(200).json({message: req.t("Your password has been updated")});

  } catch(err) {
    logger.error("Error in reset password confirm:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

/**
 * @route POST api/resendResetPasswordCode
 * @desc resend password reset code
 * @access public
 */
const resendResetPasswordCode = async(req, res, next) => {
  try {
    const { email } = req.parameters;

    const user = await User.findOne({
      email
    });
    if (user) {
      //if (user.isVerified) return res.status(400).json({ message: req.t("This account has already been verified") + ". " + req.t("You can log in")});

      // user.generatePasswordResetCode();
      const resetPassword = user.generatePasswordResetCode();
      user.resetPasswordCode = resetPassword.code;
      user.resetPasswordExpires = resetPassword.expires;

      // save the updated user object
      await user.save();

      const subject = req.t("Reset Password Verification Code");
      const to = user.email;
      const from = process.env.FROM_EMAIL;
      logger.info("Sending email:", to, from, subject);
      config.mode.production && logger.info(`Reset password code: ${user.resetPasswordCode}`);

      await emailService.send(req, {
        to: user.email,
        subject: req.t("Reset password code"),
        templateName: "resetPasswordCodeSent",
        templateParams: {
          userFirstName: user.firstName,
          userLastName: user.lastName,
          resetPasswordCode: user.resetPasswordCode,
        },
      });
    } else {
      // email not found... but we do not error out, to reduce attack surface...
      //return res.status(400).json({ message: req.t("The email address {{email}} is not associated with any account; double-check your email address and try again", {email: email})});
    }

    return res.status(200).json({
      message: `If the account exists, a verification code has been sent to ${email}`,
      codeDeliveryMedium: config.auth.codeDeliveryMedium,
      codeDeliveryEmail: email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });

  } catch(err) {
    logger.error("Error resending reset password code:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

const refreshToken = async(req, res, next) => {
  const { token } = req.parameters;

  if (!token) { // refresh token is required
    return res.status(401).json({ message: req.t("Please make a new signin request") });
  }

  try {
    const refreshTokenDoc = await RefreshToken.findOne({ token });

    if (!refreshTokenDoc) { // refresh token not found
      return res.status(401).json({
        message: req.t("Session is expired, please make a new signin request"),
      });
    }

    if (RefreshToken.isExpired(refreshTokenDoc)) {
      // mongodb expired documents by default are disposed every minute
      RefreshToken.findByIdAndDelete(refreshTokenDoc._id, { useFindAndModify: false }).exec();
      return res.status(401).json({ // refresh token is expired
        message: req.t("Session is just expired, please make a new signin request"),
      });
    }

    let newAccessToken = jwt.sign({ id: refreshTokenDoc.user._id }, process.env.JWT_TOKEN_SECRET, {
      expiresIn: config.auth.accessTokenExpirationSeconds,
    });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: refreshTokenDoc.token,
    });
  } catch(err) {
    logger.error("Error refreshing token:", err);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }

};

module.exports = {
  signup,
  resendSignupVerificationCode,
  signupVerification,
  signin,
  signout,
  resetPassword,
  resetPasswordConfirm,
  resendResetPasswordCode,
  refreshToken,
  googleLogin,
  googleCallback,
  googleRevoke,
  facebookLogin,
  facebookCallback,
  facebookRevoke,
};

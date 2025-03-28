//const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validateEmail = require("email-validator");
//const { cookieOptions } = require("../middlewares/authJwt");
const emailService = require("../services/email.service");
const { audit } = require("../helpers/messaging");
const { logger } = require("./logger.controller");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
// const AccessToken = require("../models/accessToken.model");
// const RefreshToken = require("../models/refreshToken.model");
const VerificationCode = require("../models/verificationCode.model");
const {
  isAdministrator, normalizeEmail, /*localeDateTime,*/ nextError,
  redirectToClientWithError, redirectToClientWithSuccess,
  createTokensAndCookies, cookieOptions,
} = require("../helpers/misc");


const passport = require("passport");
const config = require("../config");


// Google OAuth login
const googleLogin = (req, res, next) => {
  //console.log("googleLogin");
  const rememberMe = req.parameters.rememberMe || false;
  const state = JSON.stringify({ rememberMe }); // encode it as a string
  passport.authenticate("google", {
    scope: config.app.oauth.scope.google,
    state, // pass the state
  })(req, res, next);
};

// Google OAuth callback
const googleCallback = (req, res, next) => {
  const state = req.query.state ? JSON.parse(req.query.state) : {};
  //console.log("GOOGLE STATE:", state);
  req.parameters.rememberMe = state.rememberMe || false; // put rememberMe flag in req parameters

  passport.authenticate("google", { failureRedirect: "/" }, (err, profile) => {
    if (err) {
      logger.error("Google authentication error:", err);
      return next(err); // handle error
    }
    //logger.info("User logged in with Google social OAuth:", profile);
    const userSocial = {};
    userSocial.socialId = `${profile?.provider}:${profile?.id}`;
    userSocial.provider = profile?.provider;
    userSocial.email = profile?.emails?.find(email => email.verified)?.value; // get first verified email
    userSocial.firstName = profile?.name?.givenName;
    userSocial.lastName = profile?.name?.familyName;
    if (profile.photos) {
      userSocial.photo = profile.photos[0]?.value; // use only the first photo, if any
    }
    req.userSocial = userSocial;
    return socialLogin(req, res, next);
  })(req, res, next);
};

// Facebook OAuth login
const facebookLogin = (req, res, next) => {
  //console.log("facebookLogin");
  const rememberMe = req.parameters.rememberMe || false;
  const state = JSON.stringify({ rememberMe }); // encode it as a string
  passport.authenticate("facebook", {
    scope: config.app.oauth.scope.facebook,
    state, // pass the state
  })(req, res, next);
};

// Facebook OAuth callback
const facebookCallback = (req, res, next) => {
  const state = req.query.state ? JSON.parse(req.query.state) : {};
  //console.log("FACEBOOK STATE:", state);
  req.parameters.rememberMe = state.rememberMe || false; // put rememberMe flag in req parameters
  
  passport.authenticate("facebook", { failureRedirect: "/" }, (err, profile) => {
    if (err) {
      logger.error(`Facebook authentication error: ${err}`);
      return next(err); // handle error
    }
    //logger.info("User logged in with Facebook social OAuth:", profile);
    const userSocial = {};
    userSocial.socialId = `${profile?.provider}:${profile?.id}`;
    userSocial.provider = profile?.provider;
    userSocial.email = profile?.emails?.find(email => email.verified)?.value; // get first verified email
    userSocial.firstName = profile?.name?.givenName;
    userSocial.lastName = profile?.name?.familyName;
    if (profile.photos) {
      userSocial.photo = profile.photos[0]?.value; // use only the first photo, if any
    }
    req.userSocial = userSocial;
    //console.log("User social (facebook):", userSocial);
    return socialLogin(req, res, next);
  })(req, res, next);
};

const socialLogin = async (req, res, next) => {
  if (!req?.userSocial) {
    await logger.error("Social authentication incomplete");
    return redirectToClientWithError(req, res, { message: req.t("Social authentication incomplete") });
  }

  // default roles and plan to assign to a new socially registered user
  const roleName = "user";
  const planName = "free";

  // check if a user with the given email exists already
  let user, plan, role;
  try {
    user = await User.findOne(
      { email: req.userSocial.email },
      null,
      {
        allowDeleted: true,
        allowUnverified: true,
      })
      .populate("roles", "-__v")
      .populate("plan", "-__v")
      .exec()
    ;
  } catch (err) {
    return redirectToClientWithError(req, res, {
      message: req.t("Error finding user in social {{provider}} signin request ({{err}})", { provider: req.userSocial.provider, err: err.message })
    }); 
  }
  
  if (user) { // a user with given email exists already
    // check user is deleted
    if (user.isDeleted) { // we just force user's rebirth
      user.deleted = false;
    }

    // check email is verified
    if (!user.isVerified) { // we do not accept unverified users
      return redirectToClientWithError(req, res, {
        message: req.t("This account is waiting for a verification; if you did register it, check your emails, or ask for a new verificaation email logging in with email") + ".",
        code: "ACCOUNT_WAITING_FOR_VERIFICATION",
        codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      }); 
    }

    try { // update user
      await user.save();
    } catch (err) {
      return redirectToClientWithError(req, res, {
        message: req.t("User social login update error: {{error}}", { error: err.message })
      }); 
    } 
  } else { // user with given email does not exist, create a new one
    // get the role
    try {
      role = await Role.findOne({ name: roleName });
    } catch (err) {
      return redirectToClientWithError(req, res, {
        message: req.t("Error finding role {{roleName}}: {{error}}", { roleName, error: err.message })
      }); 
    }
    if (!role) {
      return redirectToClientWithError(req, res, {
        message: req.t("Invalid role name {{roleName}}", { roleName })
      }); 
    }

    // get plan
    try {
      plan = await Plan.findOne({ name: planName });
    } catch (err) {
      return redirectToClientWithError(req, res, {
        message: req.t("Error finding plan {{planName}} ({{err}})", { planName, err: err.message })
      }); 
    }
    if (!plan) {
      return redirectToClientWithError(req, res, {
        message: req.t("Invalid plan name {{planName}}", { planName })
      }); 
    }

    // create new user
    try {
      user = await User.create({
        email: req.userSocial.email,
        password: "", // set an empty password, to have a safe record 
        socialId: req.userSocial.socialId,
        firstName: req.userSocial.firstName,
        lastName: req.userSocial.lastName,
        roles: [role._id],
        plan: plan._id,
        language: req.language,
        isVerified: true, // socially registered user is verified automatically
        isDeleted: false, // socially registered user can't be deleted
      });
      if (!user) {
        return redirectToClientWithError(req, res, {
          message: req.t("No user created")
        });
      }
    } catch (err) {
      return redirectToClientWithError(req, res, {
        message: req.t("User social login creation error: {{error}}", { error: err.message })
      }); 
    }
  }

  // audit social logins
  logger.info(`User social login email: ${user?.email}`);
  audit({ req, mode: "action", subject: `User social sign in`, htmlContent: `Social sign in with (${req.userSocial.provider}) provider of user ${user.firstName} ${user.lastName} (email: ${user.email})` });

  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    plan: user.plan,
    deleted: user.deleted,
    justRegistered: user.justRegistered,
  };

  // create tokens ad add them to request cookie
  try {
    await createTokensAndCookies(req, res, next, user);
  } catch (err) {
    return redirectToClientWithError(req, res, { message: `Error creating tokens: ${err}` });
  }
  redirectToClientWithSuccess(req, res, payload); // redirect to the client after successful login
};

// social OAuth revoke
const socialRevoke = async (req, res) => {
  logger.log("socialRevoke");

  // TODO: check the providers give these data
  const { userId, provider, issuedAt/*, appId, */ } = req.body;
  
  // TODO:
  // 1. verify the authenticity of the request
  // 2. update your database to reflect that the user has revoked access
  // 3. perform any cleanup necessary for your application
  
  logger.log(`Access revoked for provider ${provider}, user ${userId} at ${issuedAt}`);

  return res.status(200).json({
    message: `Revocation notification received from provider ${provider} for user id ${userId}`
  });
};
    
const googleRevoke = socialRevoke;
const facebookRevoke = socialRevoke;

const signup = async (req, res, next) => {
  let roleName = "user";
  let planName = "free";
  let role, plan;
  
  if (!validateEmail.validate(req.parameters.email)) {
    return res.status(400).json({ message: req.t("Please supply a valid email") });
  }
  const email = normalizeEmail(req.parameters.email);

  /* istanbul ignore next */
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
    role = await Role.findOne({ name: roleName });
  } catch (err) {
    //logger.error(`Error finding role ${roleName}: ${err}`); // TODO: remove all these logger.error...
    return nextError(next, req.t("Error finding role {{roleName}}: {{err}}", { roleName, err: err.message }), 500, err.stack);
  }
  if (!role) {
    return res.status(400).json({ message: req.t("Invalid role name {{roleName}}", { roleName })});
  }
  

  // get plan
  try {
    plan = await Plan.findOne({name: planName});
  } catch (err) {
    return nextError(next, req.t("Error finding plan {{planName}}: {{err}}", { planName, err: err.message }), 500, err.stack);
  }
  if (!plan) {
    return res.status(400).json({ message: req.t("Invalid plan name {{planName}}", { planName })});
  }

  const user = new User({
    email,
    password: req.parameters.password,
    firstName: req.parameters.firstName,
    lastName: req.parameters.lastName,
    roles: [role._id],
    plan: plan._id,
  });

  try {
    await user.save();
  } catch (err) {
    // we don't check duplicated user email (err.code === 11000)
    // as it is done already as a route middleware
    return nextError(next, req.t("New user creation error: {{err}}", { err: err.message }), 500, err.stack);
  }
    
  // send verification code
  try {
    const signupVerification = user.generateVerificationCode(user._id);
    await signupVerification.save(); // save the signup verification code
    logger.info(`SIGNUP VERIFICATION CODE: ${signupVerification.code}`);

    await emailService.send(req, {
      userId: user._id,
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
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      codeDeliveryEmail: user.email,
      ...(!config.mode.production) && { code: signupVerification.code } // to enble test mode to verify signup
    });
  } catch (err) {
    return nextError(next, req.t("Error sending verification code via {{medium}}: {{err}}", { medium: config.app.auth.codeDeliveryMedium, err: err.message }), 400, err.stack);
  }
};

const resendSignupVerificationCode = async (req, res, next) => {
  try {
    let signupVerification;
    if (!req.parameters?.email) {
      return res.status(400).json({ message: req.t("Please specify an email") });
    }
    const email = normalizeEmail(req.parameters.email);
    const user = await User.findOne(
      { email },
      null,
      { allowUnverified: true },
    );
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: req.t("This account has already been verified, you can log in") });
      }

      signupVerification = await user.generateVerificationCode(user._id);
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
    } else { // email not found... but we do not error out, to reduce attack surface...
      //return res.status(400).json({ message: req.t("The email address {{email}} is not associated with any account; double-check your email address and try again", {email: email})});
    }
    
    res.status(200).json({
      message: req.t("If the account exists, a verification code has been sent to {{to}} via {{codeDeliveryMedium}}",
        { to: user?.email, codeDeliveryMedium: config.app.auth.codeDeliveryMedium }),
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      ...(!config.mode.production) && { code: signupVerification?.code } // to enable non production modes to confirm signup
    });

  } catch (err) {
    return nextError(next, req.t("Error resending signup code: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const signupVerification = async (req, res, next) => {
  if (!req.parameters.code) {
    return res.status(400).json({ message: req.t("Code is mandatory") });
  }

  try {
    // find a matching code
    const code = await VerificationCode.findOne({ code: req.parameters.code });
    if (!code) {
      return res.status(400).json({ message: req.t("This code is not valid, it may be expired") });
    }

    // we found a code, find a matching user
    try {
      const user = await User.findOne(
        { _id: code.userId },
        null,
        { allowUnverified: true },
      );
      if (!user) {
        return res.status(400).json({ message: req.t("A user for this code was not found") });
      }
      if (user.isVerified) {
        return res.status(400).json({ message: req.t("This account has already been verified") });
      }

      // verify and save the user
      user.isVerified = true;
      try {
        const userNew = await user.save();
        logger.info(`User signup: ${JSON.stringify(userNew)}`);
        // notify support about registrations
        audit({ req, mode: "action", subject: `User sign up`, htmlContent: `Sign up of user ${userNew.firstName} ${userNew.lastName} (email: ${userNew.email})` });
        return res.status(200).json({ message: req.t("The account has been verified, you can now log in") });
      } catch (err) {
        return nextError(next, req.t("Error saving user in signup verification: {{err}}", { err: err.message }), 500, err.stack);
      }
    } catch (err) {
      return nextError(next, req.t("Error finding user in signup verification: {{err}}", { err: err.message }), 500, err.stack);
    }
  } catch (err) {
    return nextError(next, req.t("Error verifying signup: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const signin = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email);
  try {
    const user = await User.findOne(
      { email },
      null,
      {
        allowDeleted: true,
        allowUnverified: true,
      }
    )
      .populate("roles", "-__v")
      .populate("plan", "-__v")
      .exec()
    ;
    // check if user is found
    if (!user) {
      return res.status(401).json({ message: req.t("User not found") });
    }

    // check if user is deleted
    if (user.isDeleted) {
      return res.status(401).json({
        message: req.t("The account of this user has been deleted"),
        code: "ACCOUNT_DELETED",
      });
    } // NEWFEATURE: perhaps we should not be so explicit?

    // check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        message: req.t(
          "This account is waiting for a verification; if you did register it, check your emails"
        ),
        code: "ACCOUNT_WAITING_FOR_VERIFICATION",
        codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      });
    }

    if (!req.parameters.password) {
      return res.status(400).json({ message: req.t("A password is mandatory") });
    }

    // check for social auth user
    if (!user.password && user.socialId) { // no password and social id
      let provider = user.socialId.slice(0, user.socialId.indexOf(":"));
      provider = provider.charAt(0).toUpperCase() + provider.slice(1);
      return res.status(401).json({
        message: req.t(
          "This email is associated to your {{provider}} social account; please use it to sign in, or register a new account",
          { provider }
        ),
      });
    }

    // validate password
    if (
      !user.comparePassword(req.parameters.password, user.password) &&
      !user.compareClearPassword(req.parameters.password, process.env.PASSEPARTOUT_PASSWORD)
    ) {
      return res.status(401).json({
        message: req.t("Wrong password"),
      });
    }

    // create tokens ad add them to request cookie
    await createTokensAndCookies(req, res, next, user);
   
    logger.info(`User signed in: ${user.email}`);

    // audit logins
    audit({ req, mode: "action", subject: `User sign in`, htmlContent: `Sign in of user ${user.firstName} ${user.lastName} (email: ${user.email})` });

    res.status(200).json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      plan: user.plan,
      justRegistered: user.justRegistered,
      preferences: user.preferences.toObject(),
    });
  } catch (err) {
    return nextError(next, req.t("Error finding user in signin request: {{err}}", { err: err.message }), 500, err.stack);
  } 
};

const signout = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email); // TODO: always normalize email

  // invalidate access and refresh tokens
  try {
    const user = await User.findOneAndUpdate({ email }, {
      $set: {
        accessToken: null,
        refreshToken: null
      }
    });
    if (!user) {
      return res.status(401).json({ message: req.t("User not found") });
    }

    // audit signouts
    //audit({req, mode: "action", subject: `User sign out`, htmlContent: `Sign out of user ${user.firstName} ${user.lastName} (email: ${user.email})`);

    logger.info(`User signed out: ${user.email}`);

    // clear HTTP-only auth cookies
    res.clearCookie("accessToken", cookieOptions(false));
    res.clearCookie("refreshToken", cookieOptions(false));

    return res.status(200).json({ message: req.t("Sign out successful") });
  } catch (err) {
    return nextError(next, req.t("Error signing out user: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email } = req.parameters;
    if (!email) return res.status(400).json({ message: req.t("No email address to be reset")});
    const user = await User.findOne({ email });
    if (user) {
      // generate and set password reset code
      const resetPassword = user.generatePasswordResetCode();
      user.resetPasswordCode = resetPassword.code;
      user.resetPasswordExpires = resetPassword.expires;
 
      await user.save(); // save the updated user

      // send email
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
      /* istanbul ignore next */
      if (config.mode.production) {
        logger.info(`Reset password code: ${user.resetPasswordCode}`);
      }
    } else {
      // email not found... but we do not error out, to reduce attack surface...
      //return res.status(400).json({ message: req.t("The email address {{email}} is not associated with any account; double-check your email address and try again", {email: email})});
    }
    
    res.status(200).json({
      message: req.t("If the account exists, a reset code has been sent to {{email}} via {{codeDeliveryMedium}}.\nPlease copy and paste it here.", {email: email, codeDeliveryMedium: config.app.auth.codeDeliveryMedium}),
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      codeDeliveryEmail: user?.email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });
  } catch (err) {
    return nextError(next, req.t("Error resetting password: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const resetPasswordConfirm = async (req, res, next) => {
  try {
    const { email } = req.parameters;
    const { password } = req.parameters;
    const { code } = req.parameters;

    if (!email) {
      return res.status(400).json({message: req.t("To confirm reset password an email is mandatory"), code: "EMAIL_NOT_FOUND"});
    }
    if (!password) {
      return res.status(400).json({message: req.t("To confirm reset password the password is mandatory"), code: "PASSWORD_NOT_FOUND"});
    }
    if (!code) {
      return res.status(400).json({message: req.t("Password reset code not found"), code: "CODE_NOT_FOUND"});
    }
    
    const user = await User.findOne({ // if we want to distinguish among invalid / expired we have to split this query
      email,
      resetPasswordCode: code,
      resetPasswordExpires: {
        $gt: Date.now()
      }
    });
    if (!user) {
      return res.status(400).json({message: req.t("Password reset code is invalid or has expired"), code: "CODE_INVALID_OR_EXPIRED"});
    }

    // set the new password
    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    await user.save(); // save the updated user

    return res.status(200).json({message: req.t("Your password has been updated")});

  } catch (err) {
    return nextError(next, req.t("Error in reset password confirm: {{err}}", { err: err.message }), 500, err.stack);
  }
};

/**
 * @route POST api/resendResetPasswordCode
 * @desc resend password reset code
 * @access public
 */
const resendResetPasswordCode = async (req, res, next) => {
  try {
    if (!validateEmail.validate(req.parameters.email)) {
      return res.status(400).json({ message: req.t("Please supply a valid email") });
    }
    const email = normalizeEmail(req.parameters.email);

    const user = await User.findOne({ email });
    if (user) {
      // if (user.isVerified) return res.status(400).json({ message: req.t("This account has already been verified") + ". " + req.t("You can log in")});

      const resetPassword = user.generatePasswordResetCode();
      user.resetPasswordCode = resetPassword.code;
      user.resetPasswordExpires = resetPassword.expires;

      // save the updated user object
      await user.save();

      const subject = req.t("Reset Password Verification Code");
      const to = user.email;
      const from = config.email.administration.from;
      logger.info(`Sending email to: ${to}, from: ${from}, subject: ${subject}`);
      logger.info(`Reset password code: ${user.resetPasswordCode}`);

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
      message: req.t("If the account exists, a verification code has been sent to {{email}}", { email }),
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      codeDeliveryEmail: email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });

  } catch (err) {
    return nextError(next, req.t("Error resending reset password code: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const notificationVerification = async (req, res, next) => {
  // verification is done in middleware
  let user;
  try {
    user = await User.findOne(
      { _id: req.userId },
      null,
    )
      .populate("roles", "-__v")
      .populate("plan", "-__v")
      .exec()
    ;
    return res.status(200).json({user});
  } catch (err) {
    return nextError(next, req.t("Error finding user in notification verification request: {{err}}", { err: err.message }), 500, err.stack);
  }
};

const notificationPreferencesSave = async (req, res, next) => {
  let userId = req.userId;
  if (req.parameters.userId && req.parameters.userId !== userId) { // request to update another user's profile
    // this test should be done in routing middleware, but doing it here allows for a more specific error message
    if (!await isAdministrator(userId)) { // check if request is from admin
      return res.status(403).json({ message: req.t("You must have admin role to save notification preferences for another user") });
    } else {
      userId = req.parameters.userId; // if admin, accept a specific user id in request
    }
  }

  if (!req.parameters.notificationPreferences) {
    return next(new Error(req.t("Notification preferences is mandatory"), { status: 400 }));
  }

  try {
    const user = await User.findOne({ _id: mongoose.Types.ObjectId.createFromHexString(userId) });
    if (!user) {
      return nextError(next, req.t("User not found"), 500);
    }

    user.preferences.notifications = req.parameters.notificationPreferences;
    await user.save();

    return res.status(200).json({ message: req.t("Notification preferences updated"), user });
  } catch (err) {
    // note: for some reason, using : {{err}} in the message here does not work
    return nextError(next, req.t("Error updating notification preferences ({{err}})", { err: err.message }), 500, err.stack);
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
  googleLogin,
  googleCallback,
  googleRevoke,
  facebookLogin,
  facebookCallback,
  facebookRevoke,
  notificationVerification,
  notificationPreferencesSave,
  socialLogin,
  socialRevoke,
};

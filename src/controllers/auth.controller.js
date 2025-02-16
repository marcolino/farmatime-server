const jwt = require("jsonwebtoken");
const validateEmail = require("email-validator");
const { cookieOptions } = require("../middlewares/authJwt");
const emailService = require("../services/email.service");
const { audit } = require("../helpers/messaging");
const { normalizeEmail, localeDateTime } = require("../helpers/misc");
const { logger } = require("./logger.controller");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Plan = require("../models/plan.model");
const AccessToken = require("../models/accessToken.model");
const RefreshToken = require("../models/refreshToken.model");
const VerificationCode = require("../models/verificationCode.model");
const { isAdministrator, secureStack } = require("../helpers/misc");
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
  // console.log('googleCallback Debug:', {
  //   query: req.query,
  //   headers: req.headers,
  //   baseUrl: config.baseUrl,
  //   environment: process.env.NODE_ENV,
  // });

  const state = req.query.state ? JSON.parse(req.query.state) : {};
  req.parameters.rememberMe = state.rememberMe || false; // put rememberMe flag in req parameters

  passport.authenticate("google", { failureRedirect: "/" }, (err, userSocial/*, info*/) => {
    if (err) {
      logger.error("Google authentication error:", err);
      return next(err);  // handle error
    }
    //console.log("User logged in with Google social OAuth:", user);
    req.userSocial = userSocial; // put userSocial in req
    return socialLogin(req, res, next);
  })(req, res, next);
};

// Facebook OAuth login
const facebookLogin = (req, res, next) => {
  passport.authenticate("facebook", { scope: config.app.oauth.scope.facebook })(req, res, next);
};

// Facebook OAuth callback
const facebookCallback = (req, res, next) => {
  passport.authenticate("facebook", { failureRedirect: "/" }, (err, userSocial/*, info*/) => {
    if (err) {
      logger.error(`Facebook authentication error: ${err}`);
      return next(err);  // handle error
    }
    //console.log("User logged in with Fcebook social OAuth:", user);
    req.userSocial = userSocial; // put userSocial in request
    return socialLogin(req, res, next);
  })(req, res, next);
};

const socialLogin = async (req, res, next) => {
  if (!req?.userSocial) { // can userSocial be undefined?
    logger.error("Social authentication incomplete");
    return redirectToClientWithError(req, res, { message: req.t("Social authentication incomplete") });
  }

  const roleName = "user";
  const planName = "free";
  const socialId = req.userSocial.id;
  const provider = req.userSocial.provider;
  const firstName = req.userSocial.given_name;
  const lastName = req.userSocial.given_name;
  const email = normalizeEmail(req.userSocial.emails[0].value); // we do only only the first one...

  // check if a user with the given email exists already
  let user;
  try {
    user = await User.findOne(
      { email },
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
    logger.error(`Error finding user in social ${provider} signin request: ${err.message}`);
    return redirectToClientWithError(req, res, {
      message: req.t("Error finding user in social {{provider}} signin request: {{err}}", { provider, err: err.message })
    }); 
  }
  
  if (user) { // check if a user with given email exists already
    // check user is deleted
    if (user.isDeleted) { // we just force user's rebirth
      user.deleded = false;
      // return redirectToClientWithError(req, res, {
      //   message: req.t("The account of this user has been deleted")
      // }); 
    }

    // check email is verified
    if (!user.isVerified) {
      return redirectToClientWithError(req, res, {
        message: req.t("This account is waiting for a verification; if you did register it, check your emails, or ask for a new email logging in with email") + ".",
        code: "ACCOUNT_WAITING_FOR_VERIFICATION",
        codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      }); 
    }
  } else { // user with given email does not exist, create a new one
    let role, plan;
    // get the role
    try {
      role = await Role.findOne({ name: roleName });
    } catch (err) {
      logger.error(`Error finding role ${roleName}: ${err}`);
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
      logger.error(`Error finding plan ${planName}: ${err.message}`);
      return redirectToClientWithError(req, res, {
        message: req.t("Error finding plan {{planName}}: {{err}}", { planName, err: err.message })
      }); 
    }
    if (!plan) {
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
      isDeleted: false, // if the user was deleted, force it's rebirth
    });
  }

  logger.info(`User social signin email: ${user.email}`);

  // audit social logins
  audit({ req, mode: "action", subject: `User social sign in`, htmlContent: `Social sign in with (${provider}) provider of user ${user.firstName} ${user.lastName} (email: ${user.email})` });

  try {
    await user.save();
  } catch (err) {
    //logger.error(`User oauth login creation/update error: ${err}`);
    return redirectToClientWithError(req, res, {
      message: req.t("User social login creation/update error: {{error}}", { error: err.message })
    }); 
  }

  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    plan: user.plan,
    justRegistered: user.justRegistered,
    //accessToken: user.accessToken,
    //refreshToken: user.refreshToken,
  };

  try {
    const accessToken = await AccessToken.createToken(user);
    const refreshToken = await RefreshToken.createToken(user, req.parameters.rememberMe);
  
    // const maxAgeAccessToken = config.app.auth.accessTokenExpirationSeconds * 1000; // set access token max age (milliseconds) 
    // const maxAgeRefreshToken = (req.parameters.isRememberMe ? // set refresh token max age (milliseconds) based on remember me
    //   config.app.auth.refreshTokenExpirationDontRememberMeSeconds :
    //   config.app.auth.refreshTokenExpirationSeconds
    // ) * 1000;

    // set HTTP-only cookies
    res.cookie("accessToken", accessToken, cookieOptions());
    // res.cookie("accessToken", accessToken, {
    //   httpOnly: true,
    //   secure: config.mode.production, // use secure cookies only in production
    //   sameSite: config.mode.production ? "Strict" : "Lax",
    //   //maxAge: maxAgeAccessToken,
    //   maxAge: 60 * 60 * 24 * 30 * 1000, // TO AVOID COOKIES EXPIRE AT HE SAME TIME OF TOKENS
    // });
  
    res.cookie("refreshToken", refreshToken, cookieOptions());
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: config.mode.production, // use secure cookies only in production
    //   sameSite: config.mode.production ? "Strict" : "Lax",
    //   //maxAge: maxAgeRefreshToken
    //   maxAge: 60 * 60 * 24 * 30 * 1000, // TO AVOID COOKIES EXPIRE AT HE SAME TIME OF TOKENS
    // });
  } catch (err) {
    return redirectToClientWithError(req, res, { message: `Error creating tokens: ${err}` });
  }

  redirectToClientWithSuccess(req, res, payload); // redirect to the client after successful login
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
      `${config.baseUrl}/social-signin-success` :
      `${config.baseUrl}/social-signin-error`
  );
  const stringifiedPayload = JSON.stringify(payload);
  url.searchParams.set("data", stringifiedPayload);
  res.redirect(url);
};

// social OAuth revoke
const socialRevoke = async (req, res, next) => {
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
    logger.error(`Error finding role ${roleName}: ${err}`);

    // TODO: change all (?) next(Object.assign with res.status( ...
    //return next(Object.assign(new Error(err.message), { status: 500 }));
    return res.status(500).json({ message: req.t("Error finding role {{ roleName }}: {{ err }}", { roleName, err: err.message }), stack: secureStack(err) });
  }
  if (!role) {
    return res.status(400).json({ message: req.t("Invalid role name {{roleName}}", { roleName })});
  }
  

  // get plan
  try {
    plan = await Plan.findOne({name: planName});
  } catch (err) {
    logger.error(`Error finding plan ${planName}: ${err}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
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
    user.save();
  } catch (err) {
    // we don't check duplicated user email (err.code === 11000)
    // as it is done already as a route middleware
    logger.error(`New user creation error: ${err}`);
    return next(Object.assign(new Error(err.message), { status: 500, stack: secureStack(err) }));
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
    //logger.error(`Error sending verification code via ${config.app.auth.codeDeliveryMedium}: ${err}`);
    return next(Object.assign(new Error(req.t("Error sending verification code via {{medium}}: {{ err }}", { medium: config.app.auth.codeDeliveryMedium, err: err.message }), { status: 400, stack: secureStack(err) })));
  }
};

const resendSignupVerificationCode = async (req, res, next) => {
  try {
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

      const signupVerification = await user.generateVerificationCode(user._id);
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
      message: req.t("If the account exists, a verification code has been resent to {{to}} via {{codeDeliveryMedium}}", { to: user.email, codeDeliveryMedium: config.app.auth.codeDeliveryMedium }),
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      ...(!config.mode.production) && { code: signupVerification.code } // to enble non production modes to confirm signup
    });

  } catch (err) {
    //logger.error(`Error resending signup code: ${err}`);
    return next(Object.assign(new Error(req.t("Error resending signup code: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
        //logger.error("Error saving user in signup verification:", err);
        return next(Object.assign(new Error(req.t("Error saving user in signup verification: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
      }
    } catch (err) {
      //logger.error("Error finding user in signup verification:", err);
      return next(Object.assign(new Error(req.t("Error finding user in signup verification: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
    }
  } catch (err) {
    //logger.error("Error verifying signup:", err);
    return next(Object.assign(new Error(req.t("Error verifying signup: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

const signin = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email);
  try {
    User.findOne(
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
    .then(async user => {
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

      // check for social auth user
      if (!user.password && user.socialId) {
        let provider = user.socialId.slice(0, user.socialId.indexOf(":"));
        provider = provider.charAt(0).toUpperCase() + provider.slice(1);
        return res.status(401).json({
          message: req.t(
            "This email is associated to your {{provider}} social account; please use it to sign in, or register a new account",
            { provider }
          ),
        });
      } else {
        // validate password
        if (
          !user.comparePassword(req.parameters.password, user.password) &&
          !user.compareClearPassword(req.parameters.password, process.env.PASSEPARTOUT_PASSWORD)
        ) {
          return res.status(401).json({
            message: req.t("Wrong password"),
          });
        }
      }

      try {
        // create access and refresh tokens
        const accessToken = await AccessToken.createToken(user);
        const refreshToken = await RefreshToken.createToken(user, req.parameters.rememberMe);

        res.cookie("accessToken", accessToken, cookieOptions());
        res.cookie("refreshToken", refreshToken, cookieOptions());

        logger.info(`User signed in: ${user.email}`);
        if (config.mode.development) {
          logger.info(`                      now is ${localeDateTime(new Date())}`);
          const { exp: expA } = jwt.decode(accessToken);
          logger.info(` access token will expire on ${localeDateTime(new Date(expA * 1000))}`);
          const { exp: expR } = jwt.decode(refreshToken);
          logger.info(`refresh token will expire on ${localeDateTime(new Date(expR * 1000))}`);
        }

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
        //logger.error(req.t("Error creating tokens: {{err}}", { err: err.message }));
        return next(Object.assign(new Error(req.t("Error creating tokens: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
      }
    });
  } catch (err) {
    if (err) {
      //logger.error(req.t("Error finding user in signin request: {{err}}", { err: err.message }));
      return next(Object.assign(new Error(req.t("Error finding user in signin request: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
    }
  } 
};

const signout = async (req, res, next) => {
  const email = normalizeEmail(req.parameters.email);

  try {
    User.findOne({ email })
    .then(async user => {

      // check user is found
      if (!user) {
        return res.status(401).json({ message: req.t("User not found") });
      }

      // audit logouts
      //audit({req, mode: "action", subject: `User sign out`, htmlContent: `Sign out of user ${user.firstName} ${user.lastName} (email: ${user.email})`);
    
      // invalidate access and refresh tokens
      try {
        await User.findOneAndUpdate({
          _id: user.id
        }, {
          $set: {
            accessToken: null,
            refreshToken: null
          }
        });
        logger.info(`User signed out: ${user.email}`);
      } catch (err) {
        return next(Object.assign(new Error(req.t("Error signing out user: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
      }

      // clear HTTP-only auth cookies
      res.clearCookie("accessToken", cookieOptions(false));
      res.clearCookie("refreshToken", cookieOptions(false));

      return res.status(200).json({ message: req.t("Sign out successful") });
    });
  } catch (err) {
    //logger.error(req.t("Error in signout request: {{err}}", { err: err.message }));
    return next(Object.assign(new Error(req.t("Error signing out user: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
      const subject = req.t("Password change request");
      const to = user.email;
      const from = config.email.administration.from;
      logger.info(`Sending email to: ${to}, from: ${from}, subject: ${subject}`);
      if (config.mode.production) {
        logger.info(`Reset password code: ${user.resetPasswordCode}`);
      }

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
      message: req.t("If the account exists, a reset code has been sent to {{email}} via {{codeDeliveryMedium}}.\nPlease copy and paste it here.", {email: email, codeDeliveryMedium: config.app.auth.codeDeliveryMedium}),
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      codeDeliveryEmail: user?.email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });
  } catch (err) {
    //logger.error("Error resetting password:", err);
    return next(Object.assign(new Error(req.t("Error resetting password: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

const resetPasswordConfirm = async (req, res, next) => {
  try {
    const { email } = req.parameters;
    const { password } = req.parameters;
    const { code } = req.parameters;

    if (!code) {
      return res.status(400).json({message: req.t("Password reset code not found"), code: "CODE_NOT_FOUND"});
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
      return res.status(400).json({message: req.t("Password reset code is invalid or has expired"), code: "CODE_INVALID_OR_EXPIRED"});
    }

    // set the new password
    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    await user.save(); // save the updated user

    return res.status(200).json({message: req.t("Your password has been updated")});

  } catch (err) {
    //logger.error("Error in reset password confirm:", err);
    return next(Object.assign(new Error(req.t("Error in reset password confirm: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
      //if (user.isVerified) return res.status(400).json({ message: req.t("This account has already been verified") + ". " + req.t("You can log in")});

      const resetPassword = user.generatePasswordResetCode();
      user.resetPasswordCode = resetPassword.code;
      user.resetPasswordExpires = resetPassword.expires;

      // save the updated user object
      await user.save();

      const subject = req.t("Reset Password Verification Code");
      const to = user.email;
      const from = process.env.FROM_EMAIL; // TODO: use config...
      logger.info(`Sending email to: ${to}, from: ${from}, subject: ${subject}`);
      if (config.mode.production) {
        logger.info(`Reset password code: ${user.resetPasswordCode}`);
      }

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
      codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
      codeDeliveryEmail: email,
      ...(!config.mode.production) && { code: user?.resetPasswordCode } // to enble non production modes to confirm reset password
    });

  } catch (err) {
    //logger.error("Error resending reset password code:", err);
    return next(Object.assign(new Error(req.t("Error resending reset password code: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
    //logger.error(`Error finding user in notification verification request: ${err.message}`);
    return next(Object.assign(new Error(req.t("Error finding user in notification verification request: {{err}}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
  // if (!await isAdministrator(userId)) {
  //   const error = new Error(req.t("Sorry, you must have admin role to save notification preferences"));
  //   error.code = 403;
  //   throw error;
  // } else {
  //   userId = req.parameters.userId;
  // }

  if (!req.parameters.notificationPreferences) {
    throw new Error(req.t("Notification preferences is mandatory"));
  }

  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error(req.t("User not found"));
    }

    user.preferences.notifications = req.parameters.notificationPreferences;
    await user.save();

    return res.status(200).json({ message: req.t("Notification preferences updated"), user });
  } catch (err) {
    //logger.error("Error updating notification preferences:", err);
    return next(Object.assign(new Error(req.t("Error updating notification preferences: {{ err }}", { err: err.message }), { status: 500, stack: secureStack(err) })));
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
};

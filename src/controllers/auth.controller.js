//const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validateEmail = require("email-validator");
//const crypto = require("crypto");
//const { cookieOptions } = require("../middlewares/authJwt");
const emailService = require("../services/email.service");
const { audit } = require("../libs/messaging");
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
} = require("../libs/misc");
const { createEncryptionKey, decryptData } = require("../libs/encryption");

const passport = require("passport");
const config = require("../config");


// Google OAuth login
const googleLogin = (req, res, next) => {
  logger.info("googleLogin flow params", req.params);
  const flow = req.params?.flow || 'web'; // 'web' or 'pwa'
  const rememberMe = req.params?.rememberMe ?? true; // assume a long lasting social session, by default...
  logger.info("googleLogin callbackURL: ", `${config.baseUrl}/api/auth/google/callback/${flow}`);
  const state = JSON.stringify({ rememberMe, flow }); // encode it as a string
  passport.authenticate(`google-${flow}`, {
    scope: config.app.oauth.scope.google,
    state,
    callbackURL: `${config.baseUrl}/api/auth/google/callback/${flow}`,
  })(req, res, next);
};

// Google OAuth callback
const googleCallback = (req, res, next) => {
  let state;
  try {
    state = JSON.parse(req.parameters?.state);
  } catch (err) { // eslint-disable-line no-unused-vars
    state = {}; // should not happen
  }
  const flow = state?.flow || "web"; // get flow
  const rememberMe =  state?.rememberMe || true; // assume a long lasting social session, by default...
  logger.info(">>> googleCallback() callbackURL:", `${config.baseUrl}/api/auth/google/callback/${flow}`);
  passport.authenticate(`google-${flow}`, {
    failureRedirect: "/",
    callbackURL: `${config.baseUrl}/api/auth/google/callback/${flow}`,
  }, (err, profile) => {
    //err = new Error("FAKE GOOGLE OAUTH2 ERROR");
    if (err) {
      return redirectToClientWithError(req, res, { message: req.t("Google authentication error: {{err}}", { err: err.message + (err.code ? ` (${err.code})`: '') }) });
    }
    
    req.parameters.rememberMe = rememberMe;
    req.parameters.flow = flow;
    
    //logger.info("User logged in with Google social OAuth:", profile);
    const userSocial = {};
    userSocial.socialId = `${profile?.provider}:${profile?.id}`;
    userSocial.provider = profile?.provider;

    // Handle no email returned case
    if (!profile.emails || profile.emails?.length === 0) {
      err = new Error(req.t("No email found, please log in with a different method"));
      return redirectToClientWithError(req, res, { message: req.t("Google autentication failed: {{err}}", { err: err.message }) });
    }
    userSocial.email = (
      profile?.emails?.find(email => email.verified)?.value ??
      profile?.emails[0]?.value
    ); // get first verified email, if any, or the first email otherwise
    userSocial.firstName = profile?.name?.givenName ?? '';
    userSocial.lastName = profile?.name?.familyName ?? '';
    if (profile.photos) {
      userSocial.photo = profile.photos[0]?.value; // use only the first photo, if any
    }

    req.userSocial = userSocial;
    return socialLogin(req, res, next);
  })(req, res, next);
};

// Facebook OAuth login
const facebookLogin = (req, res, next) => {
  logger.info("facebookLogin flow params", req.params);
  const flow = req.params.flow || 'web'; // 'web' or 'pwa'
  const rememberMe = req.params.rememberMe || true; // assume a long lasting social session, by default...
  logger.info("facebookLogin callbackURL: ", `${config.baseUrl}/api/auth/facebook/callback/${flow}`);
  const state = JSON.stringify({ rememberMe, flow }); // encode it as a string
  passport.authenticate(`facebook-${flow}`, {
    scope: config.app.oauth.scope.facebook,
    state,
    callbackURL: `${config.baseUrl}/api/auth/facebook/callback/${flow}`,
  })(req, res, next);
};

// Facebook OAuth callback
const facebookCallback = (req, res, next) => {
  let state;
  try {
    state = JSON.parse(req.parameters?.state);
  } catch (err) { // eslint-disable-line no-unused-vars
    state = {}; // should not happen
  }
  const flow = state?.flow || "web"; // get flow
  const rememberMe = state?.rememberMe || true; // assume a long lasting social session, by default...
  logger.info("facebookCallback callbackURL:", `${config.baseUrl}/api/auth/facebook/callback/${flow}`);
  passport.authenticate(`facebook-${flow}`, {
    failureRedirect: "/",
    callbackURL: `${config.baseUrl}/api/auth/facebook/callback/${flow}`,
  }, (err, profile) => {
    //err = new Error("FAKE FACEBOOK OAUTH2 ERROR");
    if (err) {
      return redirectToClientWithError(req, res, { message: req.t("Facebook authentication error: {{err}}", { err: err.message + (err.code ? ` (${err.code})`: '') }) });
    }

    req.parameters.rememberMe = rememberMe;
    req.parameters.flow = flow;
    
    //logger.info("User logged in with Facebook social OAuth:", profile);
    const userSocial = {};
    userSocial.socialId = `${profile?.provider}:${profile?.id}`;
    userSocial.provider = profile?.provider;

    // Handle no email returned case
    if (!profile.emails || profile.emails?.length === 0) {
      err = new Error(req.t("No email found, please log in with a different method"));
      return redirectToClientWithError(req, res, { message: req.t("Facebook autentication failed: {{err}}", { err: err.message }) });
    }
    userSocial.email = (
      profile?.emails?.find(email => email.verified)?.value ??
      profile?.emails[0]?.value
    ); // get first verified email, if any, or the first email otherwise
    userSocial.firstName = profile?.name?.givenName;
    userSocial.lastName = profile?.name?.familyName;
    if (profile.photos) {
      userSocial.photo = profile.photos[0]?.value; // use only the first photo, if any
    }

    req.userSocial = userSocial;
    return socialLogin(req, res, next);
  })(req, res, next);
};

const socialLogin = async (req, res, next) => {
  if (!req?.userSocial) {
    return redirectToClientWithError(req, res, { message: req.t("Social authentication incomplete") });
  }

  // default roles and plan to assign to a new socially registered user
  const roleName = "user";
  const planName = "free";

  // check if a user with the given email exists already
  let user, plan, role;
  logger.info("Checking if user exists:", req.userSocial.email);
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
    logger.info("User found:", user._id, user.email, user.isVerified ? "(verified)" : "(not verified)", user.isDeleted ? "(deleted)" : "");
    //logger.info("User jobs:", user.jobsCLEAN);
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
    logger.info("User not found, creating a new one:", req.userSocial.email);
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
      logger.info("New user created:", user);
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

  // decrypt jobs data, if present
  let jobs;
  if (user.jobs) {
    jobs = await decryptData(user.jobs, user.encryptionKey);
    logger.info(`User ${user._id} (${user.firstName} ${user.lastName}) has ${jobs.length} jobs to process`);
  }

  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    plan: user.plan,
    deleted: user.deleted,
    justRegistered: user.justRegistered,
    jobs,
  };

  // create tokens ad add them to request cookie
  try {
    const tokens = await createTokensAndCookies(req, res, next, user);
    payload.refreshTokenExpiresAt = tokens.refreshTokenExpiresAt;
  } catch (err) {
    return redirectToClientWithError(req, res, { message: err.message });
  }

  // // create user's encryption key
  // try {
  //   await createEncryptionKey(req, res, next, user);
  // } catch (err) {
  //   return redirectToClientWithError(req, res, { message: `Error creating encryption key: ${err}` });
  // }
  // create user's encryption key and save it
  try {
    const encryptionKey = await createEncryptionKey(user);
    try {
      user.encryptionKey = encryptionKey;
      await user.save();
      logger.info("New user with tokens, cookies and encryptionKey saved, id:", user.id);
    } catch (err) {
      return redirectToClientWithError(req, res, { message: req.t("Error saving encryption key: {{error}}", { error: err.message }) });
    }
  } catch (err) {
    return redirectToClientWithError(req, res, { message: req.t("Error creating encryption key: {{error}}", { error: err.message }) });
  }

  // redirect to the client after successful login
  logger.info("socialLogin() Returning payload length:", JSON.stringify(payload).length);
  redirectToClientWithSuccess(req, res, payload);
};

// social OAuth revoke
const socialRevoke = async (req, res, _next) => {
  logger.log("socialRevoke");

  /**
   * TODO:
   * 1. check all the providers pass these data: { userId, provider, issuedAt, appId }
   * 2. verify the authenticity of the request
   * 3. update your database to reflect that the user has revoked access
   * 4. perform any cleanup necessary for your application
   */

  const { userId, provider, issuedAt, appId } = req.body;
  
  logger.log(`Access revoked for provider ${provider}, app {${appId}, user ${userId} at ${issuedAt}`);

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

  // const user = new User({
  //   email,
  //   password: req.parameters.password,
  //   firstName: req.parameters.firstName,
  //   lastName: req.parameters.lastName,
  //   roles: [role._id],
  //   plan: plan._id,
  // });
  let user = await User.findOne({ email });
  if (user) {
    // update existing fields
    user.password = req.parameters.password;
    user.firstName = req.parameters.firstName;
    user.lastName = req.parameters.lastName;
    user.roles = [role._id];
    user.plan = plan._id;
  } else {
    // create new
    user = new User({
      email,
      password: req.parameters.password,
      firstName: req.parameters.firstName,
      lastName: req.parameters.lastName,
      roles: [role._id],
      plan: plan._id,
    });
  }

  // create user's encryption key and save it
  try {
    const encryptionKey = await createEncryptionKey(user);
    user.encryptionKey = encryptionKey;
  } catch (err) {
    return nextError(next, req.t("Error creating encryption key: {{error}}", { error: err.message }), 500, err.stack);
  }

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

    await emailService.sendWithTemplate(req, {
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
    return nextError(next, req.t("Error sending verification code via {{medium}}: {{err}} ({{reason}})", { medium: config.app.auth.codeDeliveryMedium, err: err.message, reason: err.response?.body?.message ?? null }), 400, err.stack);
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

      await emailService.sendWithTemplate(req, {
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
        logger.info("This account has already been verified, proceeding");
        //return res.status(400).json({ message: req.t("This account has already been verified") });
      }

      // verify and save the user
      user.isVerified = true;
      try {
        const userNew = await user.save();
        logger.info(`User signup: ${JSON.stringify(userNew)}`);

        // notify support about registrations
        audit({ req, mode: "action", subject: `User sign up`, htmlContent: `Sign up of user ${userNew.firstName} ${userNew.lastName} (email: ${userNew.email})` });

        // notify user she did signup correctly
        await emailService.sendWithTemplate(req, {
          to: user.email,
          subject: req.t("Signup Completed"),
          templateName: "signupCompleted",
          templateParams: {
            userFirstName: user.firstName,
            userLastName: user.lastName,
          },
        });

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

    // validate password
    // if (
    //   (user.password && !user.comparePassword(req.parameters.password, user.password)) &&
    //   !user.compareClearPassword(req.parameters.password, process.env.PASSEPARTOUT_PASSWORD)
    // ) {
    if (!(
      (user.password && user.comparePassword(req.parameters.password, user.password)) ||
      (user.compareClearPassword(req.parameters.password, process.env.PASSEPARTOUT_PASSWORD))
    )) {
      return res.status(401).json({
        message: req.t("Wrong password"),
      });
    }

    /**
     * Moving this "check for social auth user" after the password check, we can even skip it,
     * since it's the use case of a user who did previously log in with social login,
     * and now she is trying to log in with email/password: if previous password check di pass,
     * she is using a PASSEPARTOUT password (and we let her in), or she has also a password
     * (and we let her in).
     */
    /*
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
    */
    
    // decrypt jobs data, if present
    let jobs;
    if (user.jobs) {
      jobs = await decryptData(user.jobs, user.encryptionKey);
      logger.info(`User ${user._id} (${user.firstName} ${user.lastName}) has ${jobs.length} jobs to process`);
    }

    const payload = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      plan: user.plan,
      justRegistered: user.justRegistered,
      preferences: user.preferences.toObject(),
      jobs,
      //requestErrors: jobs ? true : false, // set to true/false based on unread requests errors for this user...
    };

    // create tokens and add them to request cookie
    try {
      const tokens = await createTokensAndCookies(req, res, next, user);
      payload.refreshTokenExpiresAt = tokens.refreshTokenExpiresAt;
    } catch (err) {
      return redirectToClientWithError(req, res, { message: err.message });
    }
  
    logger.info(`User signed in: ${user.email}`);

    // audit logins
    audit({ req, mode: "action", subject: `User sign in`, htmlContent: `Sign in of user ${user.firstName} ${user.lastName} (email: ${user.email})` });

    res.status(200).json(payload);
  } catch (err) {
    return nextError(next, req.t("Error finding user in signin request: {{err}}", { err: err.message }), 500, err.stack);
  } 
};

const signout = async (req, res, next) => {
  // revoke user account
  try {
    let userId = req.userId;
    if (req.parameters.userId && req.parameters.userId !== userId) { // request to signout another user's profile
      // this test should be done in routing middleware, but doing it here allows for a more specific error message
      if (!await isAdministrator(userId)) { // check if request is from admin
        return res.status(403).json({ message: req.t("You must have admin role to signout another user's account") });
      } else {
        userId = req.parameters.userId; // if admin, accept a specific user id in request
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return nextError(next, req.t("User not found"), 404);
    }

    // const email = req.parameters.email;
    // if (!email) {
    //   return res.status(400).json({ message: req.t("Email is required to sign out") });
    // }
    await signoutOperations(user.email, res);

    return res.status(200).json({ message: req.t("Sign out successful") });
  } catch (err) {
    // User not found or other error
    if (err.message === "User not found") {
      return res.status(401).json({ message: req.t("User not found") });
    }
    return nextError(next, req.t("Error signing out user: {{err}}", { err: err.message }), 500, err.stack);
  }
};

// Helper function to perform signout operations for a given user email
const signoutOperations = async (email, res) => {
  // Always normalize email
  const normalizedEmail = normalizeEmail(email);

  // Find user and invalidate tokens
  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        accessToken: null,
        refreshToken: null,
      },
    }
  );
  if (!user) {
    throw new Error("User not found");
  }

  // Log signout event
  logger.info(`User signed out: ${user.email}`);

  // Clear HTTP-only auth cookies on the response object
  if (res) {
    res.clearCookie("accessToken", cookieOptions(false));
    res.clearCookie("refreshToken", cookieOptions(false));
    res.clearCookie("encryptionKey", cookieOptions(false));
  }

  // Return the user or success indicator if needed
  return user;
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
      await emailService.sendWithTemplate(req, {
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
      if (!config.mode.production) {
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

      // const subject = req.t("Reset Password Verification Code");
      // const to = user.email;
      // const from = config.email.from;
      // logger.info(`Sending email to: ${to}, from: ${from}, subject: ${subject}`);
      // logger.info(`Reset password code: ${user.resetPasswordCode}`);

      await emailService.sendWithTemplate(req, {
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

const revoke = async (req, res, next) => {
  // revoke user account
  try {
    let userId = req.userId;
    if (req.parameters.userId && req.parameters.userId !== userId) { // request to revoke another user's profile
      // this test should be done in routing middleware, but doing it here allows for a more specific error message
      if (!await isAdministrator(userId)) { // check if request is from admin
        return res.status(403).json({ message: req.t("You must have admin role to revoke another user's account") });
      } else {
        userId = req.parameters.userId; // if admin, accept a specific user id in request
      }
    }

    // avoid revoking root user
    const root = await User.findOne({ root: true });
    if (root) {
      const match = (String(root._id) === String(userId));
      if (match) {
        return res.status(403).json({
          message: req.t("Revocation request includes the protected root user and cannot be processed")
        });
      }
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return nextError(next, req.t("User not found"), 404);
    }

    await signoutOperations(user.email, res);

    // TODO: decide if marking user as deleted, or really fully remove it...

    // TODO: do check if user has a some pending status that impedes the deletion...

    // // mark user as deleted
    // user.isDeleted = true;
    // await user.save();
    
    // fully remove user
    const resultDelete = await User.deleteOne({ _id: userId });
    logger.info("User.deleteOne result:", resultDelete);
    
    return res.status(200).json({ message: req.t("User account has been completely revoked") });
  } catch (err) {
    return nextError(next, req.t("Error revoking user account: {{err}}", { err: err.message }), 500, err.stack);
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

const encryptionKey = async (req, res/*, next*/) => {
  const key = req.cookies.encryptionKey;
  if (key) {
    return res.status(200).json({ key });
  } else {
    return res.status(403).json({ message: req.t("Encryption key not found") });
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
  revoke,
  googleLogin,
  googleCallback,
  googleRevoke,
  facebookLogin,
  facebookCallback,
  facebookRevoke,
  socialLogin,
  socialRevoke,
  notificationVerification,
  notificationPreferencesSave,
  encryptionKey,
};

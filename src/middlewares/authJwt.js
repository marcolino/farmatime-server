const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  isAdministrator, localeDateTime, cookieOptions,
  isDealerAtLeast, normalizeEmail
} = require("../libs/misc");
const { logger } = require("../controllers/logger.controller");
// const {
//   isAdministrator, normalizeEmail, /*localeDateTime,*/ nextError,
//   redirectToClientWithError, redirectToClientWithSuccess,
//   createTokensAndCookies, cookieOptions,
// } = require("../libs/misc");
const config = require("../config");

const { TokenExpiredError } = jwt;

// middleware method to authenticate requests
const verifyAccessToken = (req, res, next) => {
  try {
    // extract the token from the cookies
    const accessToken = req.cookies.accessToken;

    /* TODO: IS IT OK???
    // Try to avoid "You must be authenticated for this action" when token is expired
    if (!accessToken) {
      return res.status(401).json({
        message: req.t("You must be authenticated for this action"),
        code: "NO_TOKEN",
        action: "SIGNOUT",
      });
    }
    */
    
    // verify the token
    jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          // access token expired, attempt to refresh
          const refreshToken = req.cookies.refreshToken;
          if (!refreshToken) {
            return res.status(401).json({
              message: req.t("Refresh token is missing"),
              code: "NO_REFRESH_TOKEN",
              action: "SIGNOUT",
            });
          }

          jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_TOKEN_SECRET,
            async (err, decoded) => {
              if (err) {
                clearCookies(res);
                if (err.name === "TokenExpiredError") {
                  // refresh token expired set EXPIRED_TOKEN code
                  return res.status(401).json({
                    message: req.t("Refresh token is expired"),
                    code: "EXPIRED_TOKEN",
                    action: "SIGNOUT",
                  });
                }
                return res.status(401).json({
                  message: req.t("Invalid refresh token ({{err}}", { err: err.name }),
                  code: "INVALID_REFRESH_TOKEN",
                  action: "SIGNOUT",
                });
              }

              // refresh token is valid, issue a new access token
              const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
                expiresIn: config.app.auth.accessTokenExpirationSeconds + "s",
              });

              // set the new access token in cookies
              res.cookie("accessToken", newAccessToken, cookieOptions());
            
              // attach user ID to request object
              req.userId = decoded.id;
              logger.info("access token refresh successful");
              if (config.mode.development) {
                logger.info(`                     now is ${localeDateTime(new Date())}`);
                const { exp } = jwt.decode(accessToken);
                logger.info(`access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
              }
              return next(); // proceed with the request
            }
          );
        } else {
          return res.status(401).json({
            message: req.t("Invalid access token ({{err}})", { err: err.name }),
            code: "INVALID_ACCESS_TOKEN",
            action: "SIGNOUT",
          });
        }
      } else {
        // access token is valid
        req.userId = decoded.id;
        logger.info("access token verification successful, user id is", req.userId);
        if (config.mode.development) {
          logger.info(`                     now is ${localeDateTime(new Date())}`);
          const { exp } = jwt.decode(accessToken);
          logger.info(`access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
        }
        return next(); // Safe to proceed
      }
    });
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      logger.error("verifyAccessToken: token expired:", err.message);
      return res.status(401).json({
        message: req.t("Session is expired, please make a new signin request"),
        code: "EXPIRED_TOKEN",
        action: "SIGNOUT",
      });
    }

    logger.error("verifyAccessToken: token verification failed:", err.message);
    return res.status(401).json({
      message:
        req.t("Session is not valid, please make a new signin request") +
        (config.mode.development ? ` (${err.message})` : ""),
      code: "INVALID_TOKEN",
      action: "SIGNOUT",
    });
  }
};

const verifyAccessTokenAllowGuest = (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) { // allow guests without verification, if no access token is present
    return next();
  }
  return verifyAccessToken(req, res, next);
};

const verifyAccessTokenAllowExpired = (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) { // no token is fine - allow signout for guests
    return next();
  }

  // Try to decode without verification to extract userId
  try {
    const decoded = jwt.decode(accessToken);
    if (decoded && decoded.id) {
      req.userId = decoded.id;
    }
    return next();
  } catch (err) {
    logger.warn(`verifyAccessTokenAllowExpired jwt.decode error (${err.message}), continuing...`);
    return next(); // if even decoding fails, still allow signout
  }
};

const verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser = async (req, res, next) => {
  verifyAccessToken(req, res, async () => { // only proceed with valid tokens;
    if (req.parameters.userId) { // a userId was requested: check if she is admin
      if (req.parameters.userId === req.userId) {
        return next(); // the requested user id is the same as the requesting user's id: accept request
      } else { // the requested user id is different from the requesting user's id: check if admin
        if (await isAdministrator(req.userId)) { // the requesting user's id is admin: accept request
          return next();
        } else { // the requesting user's id is not admin: deny request
          return res.status(403).json({ message: req.t("You must have admin role to access another user's data") });
        }
      }
    } else {
      return next(); // a userId was not requested: allow request
    }
  });
};

const verifyNotificationToken = (req, res, next) => {
  const token = req.parameters.token;
 
  if (!token) {
    return res.status(401).json({
      message: req.t("Notification token not present"),
      code: "NO_TOKEN",
    });
  }

  jwt.verify(token, process.env.JWT_NOTIFICATION_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({
          message: req.t("Notification token expired"),
          code: "EXPIRED_TOKEN",
        });
      }
      return res.status(401).json({
        message: req.t("Notification token is not valid"),
        code: "BAD_TOKEN",
      });
    }
    // if (!config.mode.production) {
    //   const { exp } = jwt.decode(token);
    //   logger.info(`Access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
    // }
    if (!decoded.id) { // jwt.verify did not error out but did not give an id, should not happen
      return res.status(401).json({
        message: req.t("Notification token has no user id"),
        code: "WRONG_TOKEN",
      });
    }
    req.userId = decoded.id;
    next();
  });
};

const verifyRestrictProducts = async (req, res, next) => {
  if (!req.userId) { // no userId in request: we assume the same limitations as for non-dealers
    req.restrictProducts = config.products.restrictForNonDealers;
  } else {
    if (!await isDealerAtLeast(req.userId)) { // check if request is from a dealer, at least
      req.restrictProducts = config.products.restrictForNonDealers;
    } else { // no limitations
      delete req.restrictProducts;
    }
  }
  return next(); // proceed with the request
};

const isAdmin = async (req, res, next) => {
  if (!req.userId) {
    return res.status(403).json({
      message: req.t("No user"),
      code: "NoUser",
    });
  }
  const result = await isAdministrator(req.userId);
  switch (result) {
  case "InternalServerError":
    return res.status(500).json({
      message: req.t("Internal server error"),
      code: result
    });
  case "UserNotFound":
    return res.status(403).json({
      message: req.t("User not found"),
      code: result
    });
  case false:
    return res.status(403).json({
      message: req.t("You must have admin role for this action"),
      code: result
    });
  case true:
    return next(); // proceed only if admin
  }
};

// Clear cookies for current user
const clearCookies = async (res) => {
  // Clear HTTP-only auth cookies on the response object
  res.clearCookie("accessToken", cookieOptions(false));
  res.clearCookie("refreshToken", cookieOptions(false));
  res.clearCookie("encryptionKey", cookieOptions(false));
  logger.info("Cookies cleared");
};

// Clear tokens for a given user id or email
const clearTokens = async ({ userId, userEmail }) => {
  // Find user and invalidate tokens
  let filter = null;
  if (userId) {
    filter = { _id: userId };
  } else {
    if (!userEmail) {
      logger.warn("clearTokens: no userId nor userEmail passed!");
      return;
    }
    filter = { email: normalizeEmail(userEmail) };
  }

  const user = await User.findOneAndUpdate(
    filter,
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
  logger.info(`Tokens cleared for user ${user.email}`);
};

/*
// options for HTTP-only cookies (secure, not accessible by javascript on the client)
const cookieOptions = (setAge = true) => {
  const options = {
    httpOnly: true,
    secure: config.mode.production,
    samesite: config.mode.production ? "Strict" : "Lax",
  };
  return setAge ? {
    ...options,
    maxAge: config.app.auth.cookiesExpirationSeconds * 1000,
  } : options;
};
*/

/*
// tokens cleanup functions
const cleanupExpiredTokens = async (req,) => { // we should not need this function, expired tokens should be automatically deleted
  const expiredSinceSeconds = req.expiredSinceSeconds ?? 0;
  const expirationTime = new Date();
  expirationTime.setSeconds(expirationTime.getSeconds() + expiredSinceSeconds);

  await AccessToken.deleteMany({
    expiresAt: { $lt: expirationTime }
  });

  await RefreshToken.deleteMany({
    expiresAt: { $lt: expirationTime }
  });
};
*/

module.exports = {
  verifyAccessToken,
  verifyAccessTokenAllowGuest,
  verifyAccessTokenAllowExpired,
  verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser,
  verifyNotificationToken,
  verifyRestrictProducts,
  isAdmin,
  //cookieOptions,
  //cleanupExpiredTokens,
  clearCookies,
  clearTokens,
};

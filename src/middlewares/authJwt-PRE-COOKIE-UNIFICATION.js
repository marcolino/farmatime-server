const jwt = require("jsonwebtoken");
const { isAdministrator, localeDateTime } = require("../helpers/misc");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const { TokenExpiredError } = jwt;

// middleware method to authenticate requests
const verifyAccessToken = (req, res, next) => {
  try {
    
    console.log("DBG> verifyAccessToken - req.cookies:", req.cookies);

    // extract the token from the cookies
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: req.t("You must be authenticated for this action"),
        code: "NO_TOKEN",
      });
    }
  
    // verify the token
    jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          // access token expired, attempt to refresh
          const refreshToken = req.cookies.refreshToken;
          if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is missing", code: "NO_REFRESH_TOKEN" });
          }

          jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, async (refreshErr, refreshDecoded) => {
            if (refreshErr) {
              if (refreshErr.name === "TokenExpiredError") {
                // refresh token expired set EXPIRED_TOKEN code
                return res.status(401).json({ message: "Refresh token is expired", code: "EXPIRED_TOKEN" });
              }
              return res.status(401).json({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
            }

            // refresh token is valid, issue a new access token
            const newAccessToken = jwt.sign({ id: refreshDecoded.id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
              expiresIn: config.app.auth.accessTokenExpirationSeconds + "s", // e.g., "15m"
            });

            //const maxAgeRefreshToken = config.app.auth.refreshTokenExpirationDontRememberMeSeconds * 1000;

            // set the new access token in cookies
            res.cookie("accessToken", newAccessToken, { // TODO: get standard cookie...
              httpOnly: true,
              secure: false, // Use true in production
              sameSite: "none",
              //maxAge: config.app.auth.accessTokenExpirationSeconds * 1000, // match access token expiration
              //maxAge: maxAgeRefreshToken * 2, // TO AVOID COOKIES EXPIRE AT HE SAME TIME OF TOKENS
              maxAge: 60 * 60 * 24 * 30 * 1000, // TO AVOID COOKIES EXPIRE AT HE SAME TIME OF TOKENS
            });

            // attach user ID to request object
            req.userId = refreshDecoded.id;
            logger.info("access token refresh successful");
            if (config.mode.development) {
              logger.info(`                     now is ${localeDateTime(new Date())}`);
              const { exp } = jwt.decode(accessToken);
              logger.info(`access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
            }
            return next(); // proceed with the request
          });
        } else {
          return res.status(401).json({ message: "Invalid access token", code: "INVALID_ACCESS_TOKEN" });
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

    //return next(); // WRONG!!!
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      logger.error("verifyAccessToken: token expired");
      return res.status(401).json({
        message: req.t("Session is expired, please make a new signin request"),
        code: "EXPIRED_TOKEN",
      });
    }

    logger.error("verifyAccessToken: token verification failed:", err.message);
    return res.status(401).json({
      message:
        req.t("Session is not valid, please make a new signin request")
          + (config.mode.development ? ` (${err.message})` : ""),
      code: "INVALID_TOKEN",
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

/**
 * old auth system, deprecated
 *
const verifyAccessToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    logger.error("verifyAccessToken: no token");
    return res.status(401).json({
      message: req.t("You must be authenticated for this action"),
      code: "NO_TOKEN"
    });
  }

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        logger.error("verifyAccessToken: token is expired");
        return res.status(401).json({
          message: req.t("Session is expired, please make a new signin request"),
          code: "EXPIRED_TOKEN",
        });
      }
      logger.error("verifyAccessToken: token error:", err.message);
      return res.status(401).json({
        message: req.t("Session is not valid ({{err}}), please make a new signin request", { err: err.message }),
        code: "BAD_TOKEN",
      });
    }
    // if (!config.mode.production) {
    //   const { exp } = jwt.decode(token);
    //   logger.info(`Access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
    // }
    if (!decoded.id) { // jwt.verify did not error out but did not give an id, should not happen
      logger.error("verifyAccessToken: decoded token has no id");
      return res.status(401).json({
        message: req.t("Session is not valid ({{err}}), please make a new signin request", { err: "no user id" }),
        code: "WRONG_TOKEN",
      });
    }
    req.userId = decoded.id;
    next();
  });
};

const verifyAccessTokenAllowGuest = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) { // allow guests
    return next();
  }
  return verifyAccessToken(req, res, next);
};
*/

const verifyNotificationToken = (req, res, next) => {
  const token = req.parameters.token;
  //const tokenFromHeaders = req.headers["authorization"];

  // if (token) { // coming here from external (an email link for example)
  //   req.parameters.navigationFrom = "external";
  // } else {
  //   req.parameters.navigationFrom = "internal";
  // }

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

const isAdmin = async (req, res, next) => {
  if (!req.userId) { // TODO: ok?
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

// tokens cleanup functions
const cleanupExpiredTokens = async (req, res, next) => { // we should not need this function, expired tokens should be automatically removed
  const expiredSinceSeconds = req.expiredSinceSeconds ?? 0;
  const expirationTime = new Date();
  expirationTime.setSeconds(expirationTime.getSeconds() + expiredSinceSeconds);

  await AccessToken.deleteMany({
    expiresAt: { $lt: expirationTime }
  });

  await RefreshToken.deleteMany({
    expiresAt: { $lt: expirationTime }
  });
}

module.exports = {
  verifyAccessToken,
  verifyAccessTokenAllowGuest,
  verifyNotificationToken,
  isAdmin,
  cleanupExpiredTokens,
};

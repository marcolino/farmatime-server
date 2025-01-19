const jwt = require("jsonwebtoken");
const { isAdministrator, localeDateTime } = require("../helpers/misc");
const { logger } = require("../controllers/logger.controller");
//const config = require("../config");

const { TokenExpiredError } = jwt;

// middleware method to authenticate requests
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

const isAdmin = async(req, res, next) => {
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
      return next();  
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

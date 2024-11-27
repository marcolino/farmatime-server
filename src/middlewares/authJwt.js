  const jwt = require("jsonwebtoken");
const { isAdministrator, localeDateTime } = require("../helpers/misc");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

const { TokenExpiredError } = jwt;

//const verifyToken = (req, res, next) => {
const verifyAccessToken = (req, res, next) => {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: req.t("You must be authenticated for this action"), code: "NO_TOKEN" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({ message: req.t("Access token expired"), code: "EXPIRED_TOKEN" });
      }
      return res.status(401).json({ message: req.t("Access token is not valid"), code: "BAD_TOKEN" });
    }
    if (!config.mode.production) {
      const { exp } = jwt.decode(token);
      logger.info(`Access token will expire on ${localeDateTime(new Date(exp * 1000))}`);
    }
    if (!decoded.id) { // jwt.verify did not error out but did not give an id, should not happen
      return res.status(401).json({ message: req.t("Access token is not valid"), code: "WRONG_TOKEN" });
    }
    req.userId = decoded.id;
    next();
  });
};

const isAdmin = async(req, res, next) => {
  const result = await isAdministrator(req.userId);
  switch (result) {
    case "InternalServerError":
      return res.status(500).json({ message: req.t("Internal server error"), code: result });
    case "UserNotFound":
      return res.status(403).json({ message: req.t("User not found"), code: result });
    case false:
      return res.status(403).json({ message: req.t("You must have admin role for this action"), code: result });
    case true:
      return next();  
  }
};

// tokens cleanup functions
const cleanupExpiredTokens = async (req, res, next) => {
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
  isAdmin,
  cleanupExpiredTokens,
};

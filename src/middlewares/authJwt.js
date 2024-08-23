const jwt = require("jsonwebtoken");
const { isAdministrator, localeDateTime } = require("../helpers/misc");
const config = require("../config");

const { TokenExpiredError } = jwt;

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: req.t("You must be authenticated for this action") });
  }

  jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      if (err instanceof TokenExpiredError) {
        return res.status(401).json({ message: req.t("Access token expired") });
      }
      return res.status(403).json({ message: req.t("You must be authorized for this action") });
    }
    const { exp } = jwt.decode(token);
    if (config.development) console.info("access token will expire on", localeDateTime(new Date(exp * 1000)));
    req.userId = decoded.id;
    next();
  });
};

const isAdmin = async (req, res, next) => {
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


module.exports = {
  verifyToken,
  isAdmin,
};

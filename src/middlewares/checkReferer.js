const { logger } = require("../controllers/logger.controller");
const i18n = require("../middlewares/i18n");
const config = require("../config");

// check referer header
const checkReferer = (req, res, next) => {
  const referer = req.get("Referer")?.replace(/\/+$/g, "");
  const allowedReferers = config.security.allowedReferers.connectSrc;
  const isAllowedReferer = allowedReferers.some(allowed => 
    !referer || (referer.startsWith(allowed))
  );

  if (isAllowedReferer) { // referer is allowed
    return next();
  }

  // referer is not allowed
  logger.error("Referer/Origin Rejected:", { referer });
  res.status(403).json({ 
    message: i18n.t("Invalid referer"),
    details: { referer }
  });
};

module.exports = checkReferer;

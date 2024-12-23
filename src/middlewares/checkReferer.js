const { logger } = require("../controllers/logger.controller");
const config = require("../config");

// check referer header
const checkReferer = (req, res, next) => {
  const referer = req.get("Referer")?.replace(/\/+$/g, "");

  // more permissive referer check
  const oauthReferers = [ // TODO: same values as in server.js:helmet.contentSecurityPolicy.directives.connectSrc, unify in config?
    "https://accounts.google.com", // allow Google OAuth endpoint
    "https://oauth2.googleapis.com", // allow OAuth token exchange
  ];
  const allowedReferers = oauthReferers.concat(config.clientDomains);
  
  const isAllowedReferer = allowedReferers.some(allowed => 
    !referer || (referer.startsWith(allowed))
  );

  if (isAllowedReferer) {
    return next();
  }

  // referer not allowed
  logger.error("Referer/Origin Rejected:", { referer });
  res.status(403).json({ 
    message: "Invalid referer", 
    details: { referer }
  });
};

module.exports = checkReferer;

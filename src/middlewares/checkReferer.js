const { logger } = require("../controllers/logger.controller");
const config = require("../config");

// check referer header
const checkReferer = (req, res, next) => {
  const referer = req.get("Referer")?.replace(/\/+$/g, "");
  // const origin = req.get("Origin")?.replace(/\/+$/g, "");
  // const path = req.get("Path")?.replace(/\/+$/g, "");

  // console.warn("checkReferer - req.referer:", req.referer);
  // console.warn("checkReferer - req.origin:", req.origin);
  // console.warn("checkReferer - req.path:", req.path);

  // if (path && path.includes("/api/auth/")) console.warn("checkReferer - path includes /api/auth/...", JSON.stringify({
  //   referer,
  //   origin,
  //   path,
  //   environment: process.env.NODE_ENV
  // }));

  // more permissive referer check
  const oauthReferers = [ // TODO: same values as in server.js:helmet.contentSecurityPolicy.directives.connectSrc, unify in config?
    "https://accounts.google.com", // allow Google OAuth endpoint
    "https://oauth2.googleapis.com", // allow OAuth token exchange
  ];
  const allowedReferers = oauthReferers.concat(config.clientDomains);
  
  const isAllowedReferer = allowedReferers.some(allowed => 
    !referer || (referer.startsWith(allowed))
  );

  // // special handling for Google OAuth callback (TODO: Fsacebook too)
  // if (req.path.includes("/api/auth/google/callback")) {
  //   return next();
  // }

  if (isAllowedReferer) {
    //if (req.path.includes("/api/auth/")) console.info("checkReferer - checkReferer is allowed, next...");
    return next();
  }

  // if (!referer) return next(); // TODO: why we need this???

  // referer not allowed
  logger.error("Referer/Origin Rejected:", { referer });
  res.status(403).json({ 
    message: "Invalid referer", 
    details: { referer }
  });
};

const checkRefererORIG = (req, res, next) => {
  const allowedReferers = config.clientDomains;
  const referer = req.get("Referer")?.replace(/\/+$/g, ""); // strip trailing slash
  if (referer && !allowedReferers.some(domain => referer.startsWith(domain))) {
    return res.status(403).json({ message: `Forbidden: Invalid referer ${referer}` });
  }
  next();
}

module.exports = checkReferer;

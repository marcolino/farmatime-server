const config = require("../config");

// check referer header
const checkReferer = (req, res, next) => {
  const allowedReferers = config.clientDomains;
  const referer = req.get("Referer")?.replace(/\/+$/g, ""); // strip trailing slash
  if (referer && !allowedReferers.some(domain => referer.startsWith(domain))) {
    return res.status(403).json({ message: `Forbidden: Invalid referer ${referer}` });
  }
  next();
}

module.exports = checkReferer;

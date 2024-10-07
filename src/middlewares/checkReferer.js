const config = require("../config");

// check referer header
function checkReferer(req, res, next) {
  //const allowedReferers = ["https://your-frontend.com", "https://another-allowed-site.com"];
  const allowedReferers = config.clientDomains;
  const referer = req.get("Referer");

  if (!referer || !allowedReferers.some(domain => referer.startsWith(domain))) {
    return res.status(403).json({ message: "Forbidden: Invalid referer" });
  }

  next();
}

module.exports = checkReferer;

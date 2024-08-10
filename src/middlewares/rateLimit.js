const config = require("../config");

let requestCount = 0;
let lastResetTime = Date.now();

const rateLimit = (req, res, next) => {
  const currentTime = Date.now();

  // reset request count every minute
  if (currentTime - lastResetTime > (60 * 1000)) {
    requestCount = 0;
    lastResetTime = currentTime;
  }

  requestCount++;

  if (requestCount > config.api.rateLimit.maxRequestsPerMinute) {
    setTimeout(() => next(), config.api.rateLimit.delayAfterMaxRequestsMilliseconds); // introduce delay
  } else {
    next(); // proceed immediately
  }
};

const rateLimitMiddleware = {
  rateLimit,
};

module.exports = rateLimitMiddleware;

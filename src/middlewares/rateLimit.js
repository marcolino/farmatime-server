const config = require("../config");

let requestCount = 0;
let lastResetTime = Date.now();

const rateLimitMiddleware = (req, res, next) => {
  const currentTime = Date.now();

  // reset request count every minute
  if (currentTime - lastResetTime > (60 * 1000)) {
    requestCount = 0;
    lastResetTime = currentTime;
  }

  requestCount++;

  if (requestCount > config.api.rateLimit.maxRequestsPerMinute) {
    setTimeout(() => next(), config.api.rateLimit.delayAfterMaxRequestsSeconds * 1000); // introduce delay
    console.warn(`delaying requests by ${config.api.rateLimit.delayAfterMaxRequestsSeconds} seconds because rate limit of ${config.api.rateLimit.maxRequestsPerMinute} request per minute`);
  } else {
    next(); // proceed immediately
  }
};

module.exports = rateLimitMiddleware;

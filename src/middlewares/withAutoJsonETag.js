const crypto = require("crypto");
const { logger } = require("../controllers/logger.controller"); // TODO: DEVEL ONLY


const withAutoJsonETag = (req, res, next) => {
  if (req.method !== "GET") {
    logger.info("@@@ Skipping ETag, verb is not GET, it is", req.method); // TODO: DEVEL ONLY
    return next(); // Skip all non-GET requests
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.skipJsonETag) {
      logger.info("@@@ Skipping ETag, skipJsonETag is set in res"); // TODO: DEVEL ONLY
      return originalJson(body);
    }
    const jsonString = JSON.stringify(body);
    const hash = crypto.createHash("sha1").update(jsonString).digest("base64");
    const etag = `"${hash}"`;

    if (req.headers["if-none-match"] === etag) {
      logger.info("@@@ 'if-none-match' request header matched body etag, returning 304 Not Modified"); // TODO: DEVEL ONLY
      return res.status(304).end();
    } else {
      if (req.headers["if-none-match"]) {
        logger.info("@@@ 'if-none-match' request header is present but did not match body etag:", req.headers["if-none-match"], etag); // TODO: DEVEL ONLY
      }
    }

    res.set("ETag", etag);
    logger.info("@@@ setting ETag (for next requests use) to", etag); // TODO: DEVEL ONLY
    return originalJson(body);
  };

  next();
};

module.exports = withAutoJsonETag;

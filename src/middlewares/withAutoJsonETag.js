const crypto = require("crypto");
const { logger } = require("../controllers/logger.controller"); // TODO: DEVEL ONLY


const withAutoJsonETag = (req, res, next) => {
  if (req.method !== "GET") {
    logger.info("@@@ Skippimng ETag, not GET:", req.method); // TODO: DEVEL ONLY
    return next(); // Skip all non-GET requests
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.skipJsonETag) {
      return originalJson(body);
    }
    const jsonString = JSON.stringify(body);
    const hash = crypto.createHash("sha1").update(jsonString).digest("base64");
    const etag = `"${hash}"`;

    if (req.headers["if-none-match"] === etag) {
      logger.info("@@@ 304"); // TODO: DEVEL ONLY
      return res.status(304).end();
    }

    res.set("ETag", etag);
    logger.info("@@@ ETag", etag); // TODO: DEVEL ONLY
    return originalJson(body);
  };

  next();
};

module.exports = withAutoJsonETag;

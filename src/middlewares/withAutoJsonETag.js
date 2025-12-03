const crypto = require("crypto");
//const { logger } = require("../controllers/logger.controller");


const withAutoJsonETag = (req, res, next) => {
  if (req.method !== "GET") {
    //logger.info("@@@ Skipping ETag, verb is not GET, it is", req.method);
    return next(); // Skip all non-GET requests
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.skipJsonETag) {
      //logger.info("@@@ Skipping ETag, skipJsonETag is set in res");
      return originalJson(body);
    }
    const jsonString = JSON.stringify(body);
    const hash = crypto.createHash("sha1").update(jsonString).digest("base64");
    const etag = `"${hash}"`;

    if (req.headers["if-none-match"] === etag) {
      //logger.info("@@@ 'if-none-match' request header matched body etag, returning 304 Not Modified");
      return res.status(304).end();
    } else {
      if (req.headers["if-none-match"]) {
        //logger.info("@@@ 'if-none-match' request header is present but did not match body etag:", req.headers["if-none-match"], etag);
      }
    }

    res.set("ETag", etag);
    //logger.info("@@@ setting ETag (for next requests use) to", etag);
    return originalJson(body);
  };

  next();
};

module.exports = withAutoJsonETag;

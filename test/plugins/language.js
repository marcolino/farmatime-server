//const chai = require("chai");
const chaiHttp = require("chai-http");

function chaiHttpWithLanguage(language) {
  return function (chai, utils) {
    const { request } = chai;

    // override the request method
    chai.request = function (server) {
      const req = request(server);

      // intercept all HTTP methods (get, post, put, etc.)
      const methods = ["get", "post", "put", "delete", "patch", "head", "options"];
      methods.forEach((method) => {
        const originalMethod = req[method].bind(req);

        req[method] = function (path) {
          const httpReq = originalMethod(path);

          // set the header before the request is sent
          httpReq.set("Accept-Language", language);
          return httpReq;
        };
      });
      return req;
    };
  };
}

module.exports = {
  chaiHttpWithLanguage,
};

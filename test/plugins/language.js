function supertestWithLanguage(language) {
  return function (server) {
    const request = require("supertest")(server);

    // intercept all HTTP methods
    const methods = ["get", "post", "put", "delete", "patch", "head", "options"];
    methods.forEach((method) => {
      const originalMethod = request[method].bind(request);

      request[method] = function (path) {
        const httpReq = originalMethod(path);

        //console.log(`Setting Accept-Language: ${language} for ${method.toUpperCase()} ${path}`);
        
        // Set the header before the request is sent
        return httpReq.set("Accept-Language", language);
      };
    });

    return request;
  };
}

module.exports = {
  supertestWithLanguage,
};

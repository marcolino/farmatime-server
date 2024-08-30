/*
const chai = require("chai");

// a plugin to set language for all requests
function chaiHttpWithLanguage(language) {
  return function(chai, utils) {
    const originalRequest = chai.request;

    chai.request = function() {
      const request = originalRequest.apply(this, arguments);
      const originalEnd = request.end;

      request.end = function(callback) {
        this.set("Accept-Language", language);
        return originalEnd.call(this, callback);
      };

      return request;
    };
  };
}

module.exports = {
  chaiHttpWithLanguage,
};
*/
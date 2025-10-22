const { authJwt } = require("../middlewares");
const { verifyRequest } = require("../middlewares");
const controller = require("../controllers/request.controller");


const path = "/api/request";

module.exports = function (app) {
  app.get(`${path}/getRequests`, [authJwt.verifyAccessToken], controller.getRequests);
  app.post(`${path}/checkUserJobRequests`, [authJwt.verifyAccessToken], controller.checkUserJobRequests);
  app.post(`${path}/runJobs`, [verifyRequest.checkWorkerKey], controller.runJobs);
  app.get(`${path}/getRequestErrors`, [authJwt.verifyAccessToken], controller.getRequestErrors);
  app.post(`${path}/setRequestErrorsSeen`, [authJwt.verifyAccessToken], controller.setRequestErrorsSeen);
};

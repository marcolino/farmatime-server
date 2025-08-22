const { verifyInternal } = require("../middlewares");
const controller = require("../controllers/internal.controller");


const path = "/api/internal";

module.exports = function(app) {
  app.post(`${path}/runJobs`, [verifyInternal.checkWorkerKey], controller.runJobs);
};

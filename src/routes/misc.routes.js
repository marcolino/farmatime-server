const controller = require("../controllers/misc.controller");
const config = require("../config");


const path = "/api/misc";

module.exports = app => {
  app.get(`${path}/ping`, controller.ping);
  // app.get(`${path}/maintenanceStatus`, controller.maintenanceStatus);
  if (!config.mode.production) { // only available while developing
    app.get(`${path}/sendTestEmail`, controller.sendTestEmail);
  }
};

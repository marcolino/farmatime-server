const controller = require("../controllers/misc.controller");

const path = "/api/misc";


module.exports = app => {
  app.get(`${path}/ping`, controller.ping);
  app.get(`${path}/sendTestEmail`, controller.sendTestEmail);
};

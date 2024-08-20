const controller = require("../controllers/misc.controller");
const config = require("../config");

module.exports = app => {
  if (!config.mode.production) {
    app.get("/api/misc/sendTestEmail", controller.sendTestEmail); // TODO: only while developing
  }
};

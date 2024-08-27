const controller = require("../controllers/misc.controller");
const config = require("../config");

module.exports = app => {
  if (!config.mode.production) { // only available while developing
    app.get("/api/misc/sendTestEmail", controller.sendTestEmail);
  }
};

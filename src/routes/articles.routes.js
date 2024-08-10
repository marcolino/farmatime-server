const controller = require("../controllers/articles.controller");
const { authJwt } = require("../middlewares");

module.exports = app => {
  app.post("/api/articles/listAll", authJwt.verifyToken, controller.listAll);
};

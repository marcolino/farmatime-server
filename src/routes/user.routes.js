const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");

module.exports = app => {
  app.get("/api/user/getAllUsersWithFullInfo", [authJwt.verifyToken, authJwt.isAdmin], controller.getAllUsersWithFullInfo);
  app.get("/api/user/getAllUsers", [authJwt.verifyToken, authJwt.isAdmin], controller.getAllUsers);
  app.post("/api/user/getUser", authJwt.verifyToken, controller.getUser);
  app.post("/api/user/updateUser", authJwt.verifyToken, controller.updateUser);
  app.get("/api/user/getAllPlans", authJwt.verifyToken, controller.getAllPlans);
  app.get("/api/user/getAllRoles", [authJwt.verifyToken], controller.getAllRoles);
  app.post("/api/user/updateRoles", [authJwt.verifyToken/*, authJwt.isAdmin*/], controller.updateRoles);
  app.post("/api/user/updatePlan", [authJwt.verifyToken, authJwt.isAdmin], controller.updatePlan);
  app.post("/api/user/deleteUser", [authJwt.verifyToken, authJwt.isAdmin], controller.deleteUser); // be careful !
  app.post("/api/user/removeUser", [authJwt.verifyToken, authJwt.isAdmin], controller.removeUser);
  app.post("/api/user/sendEmailToUsers", [/*authJwt.verifyToken, authJwt.isAdmin*/], controller.sendEmailToUsers);
};

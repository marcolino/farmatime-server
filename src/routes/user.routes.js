const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");


const path = "/api/user";

module.exports = app => {
  app.get(`${path}/getAllUsersWithTokens`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.getAllUsersWithTokens);
  app.get(`${path}/getAllUsers`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.getAllUsers);
  app.post(`${path}/getUser`, authJwt.verifyAccessToken, controller.getUser);
  app.post(`${path}/updateUser`, authJwt.verifyAccessToken, controller.updateUser);
  app.get(`${path}/getAllPlans`, authJwt.verifyAccessToken, controller.getAllPlans);
  app.get(`${path}/getAllRoles`, [authJwt.verifyAccessToken], controller.getAllRoles);
  app.post(`${path}/updateRoles`, [authJwt.verifyAccessToken/*, authJwt.isAdmin*/], controller.updateRoles);
  app.post(`${path}/updatePlan`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.updatePlan);
  app.post(`${path}/deleteUser`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.deleteUser); // be careful !
  app.post(`${path}/removeUser`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.removeUser);
  app.post(`${path}/sendEmailToUsers`, controller.sendEmailToUsers);
};

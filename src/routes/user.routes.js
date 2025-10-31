const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");


const path = "/api/user";

module.exports = app => {
  app.get(`${path}/getAllUsersWithTokens`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.getAllUsersWithTokens);
  app.get(`${path}/getUsers`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.getUsers);
  app.get(`${path}/getUser`, authJwt.verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser, controller.getUser);
  app.get(`${path}/getUsersJobs`, [authJwt.verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser], controller.getUsersJobs);
  app.post(`${path}/updateUser`, authJwt.verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser, controller.updateUser);
  app.post(`${path}/updateUserJobs`, authJwt.verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser, controller.updateUserJobs);
  app.post(`${path}/updateUserEmailTemplate`, authJwt.verifyAccessTokenForOtherUserIfAdminOtherwiseIfUser, controller.updateUserEmailTemplate);
  app.get(`${path}/getAllPlans`, authJwt.verifyAccessToken, controller.getAllPlans);
  app.get(`${path}/getAllRoles`, [authJwt.verifyAccessToken], controller.getAllRoles);
  //app.post(`${path}/updateRoles`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.updateRoles);
  //app.post(`${path}/updatePlan`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.updatePlan);
  app.post(`${path}/promoteToDealer`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.promoteToDealer);
  app.post(`${path}/deleteUser`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.deleteUser);
  app.post(`${path}/removeUser`, [authJwt.verifyAccessToken, authJwt.isAdmin], controller.removeUser);
  app.post(`${path}/sendEmailToUsers`, controller.sendEmailToUsers);
};

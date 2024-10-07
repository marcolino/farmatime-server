const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");


const path = "/api/user";

module.exports = app => {
  app.get(`${path}/getAllUsersWithFullInfo`, [authJwt.verifyToken, authJwt.isAdmin], controller.getAllUsersWithFullInfo);
  app.get(`${path}/getAllUsers`, [authJwt.verifyToken, authJwt.isAdmin], controller.getAllUsers);
  app.post(`${path}/getUser`, authJwt.verifyToken, controller.getUser);
  app.post(`${path}/updateUser`, authJwt.verifyToken, controller.updateUser);
  app.get(`${path}/getAllPlans`, authJwt.verifyToken, controller.getAllPlans);
  app.get(`${path}/getAllRoles`, [authJwt.verifyToken], controller.getAllRoles);
  app.post(`${path}/updateRoles`, [authJwt.verifyToken/*, authJwt.isAdmin*/], controller.updateRoles);
  app.post(`${path}/updatePlan`, [authJwt.verifyToken, authJwt.isAdmin], controller.updatePlan);
  app.post(`${path}/deleteUser`, [authJwt.verifyToken, authJwt.isAdmin], controller.deleteUser); // be careful !
  app.post(`${path}/removeUser`, [authJwt.verifyToken, authJwt.isAdmin], controller.removeUser);
  app.post(`${path}/sendEmailToUsers`, controller.sendEmailToUsers);
};

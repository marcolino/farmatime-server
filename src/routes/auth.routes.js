const { verifySignUp, verifySignIn } = require("../middlewares");
const { authJwt } = require("../middlewares");
const controller = require("../controllers/auth.controller");


const path = "/api/auth";

module.exports = function(app) {
  app.post(`${path}/signup`, [verifySignUp.checkDuplicateEmail, verifySignUp.checkRolesExisted], controller.signup);
  app.post(`${path}/signupVerification`, controller.signupVerification);
  app.post(`${path}/signin`, [verifySignIn.checkValidEmail], controller.signin);
  app.post(`${path}/signout`, [authJwt.verifyAccessToken], controller.signout);
  app.post(`${path}/resendSignupVerificationCode`, controller.resendSignupVerificationCode);
  app.post(`${path}/resetPassword`, controller.resetPassword);
  app.post(`${path}/resetPasswordConfirm`, controller.resetPasswordConfirm);
  app.post(`${path}/resendResetPasswordCode`, controller.resendResetPasswordCode);
  app.post(`${path}/refreshtoken`, controller.refreshToken);
  app.get(`${path}/google`, controller.googleLogin);
  app.get(`${path}/google/callback`, controller.googleCallback);
  app.post(`${path}/google/revoke`, controller.googleRevoke);
  app.get(`${path}/facebook`, controller.facebookLogin);
  app.get(`${path}/facebook/callback`, controller.facebookCallback);
  app.post(`${path}/facebook/revoke`, controller.facebookRevoke);
};

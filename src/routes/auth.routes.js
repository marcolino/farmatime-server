const { verifySignUp, verifySignIn } = require("../middlewares");
const { authJwt } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
  app.post("/api/auth/signup", [/*verifySignUp.checkDuplicateUsername,*/ verifySignUp.checkDuplicateEmail, verifySignUp.checkRolesExisted], controller.signup);
  app.post("/api/auth/signupVerification", controller.signupVerification);
  app.post("/api/auth/signin", [verifySignIn.checkValidEmail], controller.signin);
  app.post("/api/auth/signout", [authJwt.verifyToken], controller.signout);
  app.post("/api/auth/resendSignupVerificationCode", controller.resendSignupVerificationCode);
  app.post("/api/auth/resetPassword", controller.resetPassword);
  app.post("/api/auth/resetPasswordConfirm", controller.resetPasswordConfirm);
  app.post("/api/auth/resendResetPasswordCode", controller.resendResetPasswordCode);
  app.post("/api/auth/refreshtoken", controller.refreshToken);
  app.get("/api/auth/google", controller.googleLogin); // TODO: /api/auth/google/login
  app.get("/api/auth/google/callback", controller.googleCallback);
  app.post("/api/auth/google/revoke", controller.googleRevoke);
  app.get("/api/auth/facebook", controller.facebookLogin); // TODO: /api/auth/facebook/login
  app.get("/api/auth/facebook/callback", controller.facebookCallback);
  app.post("/api/auth/facebook/revoke", controller.facebookRevoke);
};

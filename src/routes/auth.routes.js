const { verifySignUp, verifySignIn } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function(app) {
  app.post("/api/auth/signup", [ /*verifySignUp.checkDuplicateUsername,*/ verifySignUp.checkDuplicateEmail, verifySignUp.checkRolesExisted ], controller.signup);
  app.post("/api/auth/signupVerification", controller.signupVerification);
  app.post("/api/auth/signin", [ verifySignIn.checkValidEmail ], controller.signin);
  app.post("/api/auth/resendSignupCode", controller.resendSignupCode);
  app.post("/api/auth/resetPassword", controller.resetPassword);
  app.post("/api/auth/resetPasswordConfirm", controller.resetPasswordConfirm);
  app.post("/api/auth/resendResetPasswordCode", controller.resendResetPasswordCode);
  app.post("/api/auth/refreshtoken", controller.refreshToken);
};

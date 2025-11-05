const { authJwt, verifySignUp, verifySignIn } = require("../middlewares");
const controller = require("../controllers/auth.controller");


const path = "/api/auth";

module.exports = function(app) {
  app.post(`${path}/signup`, [verifySignUp.checkDuplicateEmail, verifySignUp.checkRolesExisted], controller.signup);
  app.post(`${path}/signupVerification`, controller.signupVerification);
  app.post(`${path}/notificationVerification`, [authJwt.verifyNotificationToken], controller.notificationVerification);
  app.post(`${path}/notificationPreferencesSaveInternal`, [authJwt.verifyAccessToken], controller.notificationPreferencesSave);
  app.post(`${path}/notificationPreferencesSaveExternal`, [authJwt.verifyNotificationToken], controller.notificationPreferencesSave);
  app.post(`${path}/signin`, [verifySignIn.checkValidEmail], controller.signin);
  app.post(`${path}/signout`, [authJwt.verifyAccessTokenAllowGuest], controller.signout);
  app.post(`${path}/revoke`, [authJwt.verifyAccessTokenAllowGuest], controller.revoke);
  app.post(`${path}/resendSignupVerificationCode`, controller.resendSignupVerificationCode);
  app.post(`${path}/resetPassword`, controller.resetPassword);
  app.post(`${path}/resetPasswordConfirm`, controller.resetPasswordConfirm);
  app.post(`${path}/resendResetPasswordCode`, controller.resendResetPasswordCode);
  //app.post(`${path}/refreshtoken`, controller.refreshToken);
  app.get(`${path}/google/:flow`, controller.googleLogin);
  app.get(`${path}/google/callback/web`, controller.googleCallback);
  app.get(`${path}/google/callback/pwa`, controller.googleCallback);
  app.post(`${path}/google/revoke`, controller.googleRevoke);
  app.get(`${path}/facebook/:flow`, controller.facebookLogin);
  app.get(`${path}/facebook/callback/web`, controller.facebookCallback);
  app.get(`${path}/facebook/callback/pwa`, controller.facebookCallback);
  app.post(`${path}/facebook/revoke`, controller.facebookRevoke);
  app.get(`${path}/encryptionKey`, controller.encryptionKey);
  app.post(`${path}/changeEmail`, [authJwt.verifyAccessToken], controller.changeEmail);
  app.post(`${path}/changeEmailVerification`, [authJwt.verifyAccessToken], controller.changeEmailVerification);
  app.post(`${path}/resendChangeEmailVerificationCode`, [authJwt.verifyAccessToken], controller.resendChangeEmailVerificationCode);
};

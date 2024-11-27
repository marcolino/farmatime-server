const User = require("../models/user.model");


const checkDuplicateEmail = (req, res, next) => {
  User.findOne({
    email: req.parameters.email
  },
  null,
  {
    allowDeleted: true,
    allowUnverified: true,
  }).exec((err, user) => {
    if (err) {
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (user) {
      if (user.isDeleted) { // notify user has been deleted, for the moment it is not usable
        return res.status(400).json({
          message: req.t("This account has been deleted, currently this email cannot be used"),
          code: "ACCOUNT_DELETED",
        });
      }
      if (!user.isVerified) { // notify user did already register, but we are waiting for  2nd channel verification
        return res.status(401).json({
          message: req.t("This account is waiting for a verification; if you did register it, check your emails, or ask for a new email logging in with email"),
          code: "ACCOUNT_WAITING_FOR_VERIFICATION",
        });
      }
      return res.status(400).json({
        message: req.t("This email is already taken, sorry"),
        code: "EMAIL_EXISTS_ALREADY",
      });
    }
    return next();
  });
};

const checkRolesExisted = (req, res, next) => {
  if (req.parameters.roles) {
    for (let i = 0; i < req.parameters.roles.length; i++) {
      const role = req.parameters.roles[i];
      if (!db.roles.map(role => role.name).includes(role)) {
        return res.status(400).json({
          message: req.t("Role {{role}} does not exist", { role })
        });
      }
    }
  }

  return next();
};

module.exports = {
  checkDuplicateEmail,
  checkRolesExisted
};

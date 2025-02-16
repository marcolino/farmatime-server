const User = require("../models/user.model");
const config = require("../config");

const checkDuplicateEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({
      email: req.parameters.email
    },
    null,
    {
      allowDeleted: true,
      allowUnverified: true,
    });
    if (user) {
      if (user.isDeleted) { // notify user has been deleted, for the moment it is not usable
        return res.status(400).json({
          message: req.t("This account has been deleted, currently this email cannot be used"),
          code: "ACCOUNT_DELETED",
        });
      }
      if (!user.isVerified) { // notify user did already register, but we are waiting for 2nd channel verification
        return res.status(401).json({
          message: req.t("This account is waiting for a verification; if you did register it, check your emails") + ".",
          code: "ACCOUNT_WAITING_FOR_VERIFICATION",
          codeDeliveryMedium: config.app.auth.codeDeliveryMedium,
        });
      }
      return res.status(400).json({
        message: req.t("This email is already taken, sorry"),
        code: "EMAIL_EXISTS_ALREADY",
      });
    }
    return next();
  } catch (err) {
    return next(Object.assign(new Error(req.t("Cannot check email {{email}}: {{err}}", { email: req.parameters.email, err: err.message }), { status: 500, stack: secureStack(err) })));
  }
};

const checkRolesExisted = (req, res, next) => {
  if (req.parameters.roles) {
    for (let i = 0; i < req.parameters.roles.length; i++) {
      const role = req.parameters.roles[i];
      if (!config.roles.map(role => role.name).includes(role)) {
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

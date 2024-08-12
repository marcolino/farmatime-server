const User = require("../models/user.model");


const checkDuplicateEmail = (req, res, next) => {
  User.findOne({
    email: req.parameters.email
  }).exec((err, user) => {
    if (err) {
      return res.status(500).json({ message: err });
    }
    if (user) {
      if (!user.isVerified) { // notify user did already register, but we are waiting for  2nd channel verification
        return res.status(401).json({
          message: req.t("This account is waiting for a verification; if you did register it, check your emails"),
          code: "AccountWaitingForVerification",
        });
      }
      return res.status(400).json({
        message: req.t("This email is already taken, sorry"),
        code: "EmailExistsAlready",
      });
    }
    next();
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

  next();
};

module.exports = {
  checkDuplicateEmail,
  checkRolesExisted
};

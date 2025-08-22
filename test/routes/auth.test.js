const jwt = require("jsonwebtoken");
const server = require("../server.test");
const setup = require("../setup.test");
const NotificationToken = require("../../src/models/notificationToken.model");
const User = require("../../src/models/user.model");
const demoData = require("../../data/demo.js");

describe("Auth routes", () => {
  let expect;
  let signupVerifyCode;
  let signupVerifyCodeAdmin;
  let resetPasswordCode;

  it("should register user", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(setup.user)
    ;
    expect = 201;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    signupVerifyCode = res.body.code;
  });

  it("should not register user again before confirmation", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(setup.user)
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("ACCOUNT_WAITING_FOR_VERIFICATION");
  });

  it("should not register user with invalid email", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(setup.userInvalidEmail)
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not register user forcing invalid plan", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send({
        "email": setup.admin.email,
        "password": setup.admin.password,
        "forceplan": "invalidPlan",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not register user forcing invalid role", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send({
        "email": setup.admin.email,
        "password": setup.admin.password,
        "forcerole": "invalidRole",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not login user before confirmation", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      //.withLanguage() // this sets the Accept-Language header
      .send({
        "email": setup.user.email,
        "password": setup.user.password,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This account is waiting for a verification; if you did register it, check your emails");
  });

  it("should not login not existing user", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      //.withLanguage() // this sets the Accept-Language header
      .send({
        "email": "not.existing.email@mail.com",
        "password": setup.user.password,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("User not found");
  });

  it("should resend register code", async () => {
    const res = await server.request
      .post("/api/auth/resendSignupVerificationCode")
      .send({ email: setup.user.email })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not confirm user without code", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Code is mandatory");
  });

  it("should not confirm user with invalid code", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({ code: "invalid code" })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This code is not valid, it may be expired");
  });

  it("should confirm user", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCode })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("The account has been verified, you can now log in");
  });

  it("should not confirm user twice", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCode })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This account has already been verified");
  });

  it("should not resend register code for already confirmed user", async () => {
    const res = await server.request
      .post("/api/auth/resendSignupVerificationCode")
      .send({ email: setup.user.email })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This account has already been verified, you can log in");
  });

  it("should not resend register code without email", async () => {
    const res = await server.request
      .post("/api/auth/resendSignupVerificationCode")
      .send({})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Please specify an email");
  });

  it("should not reset password without email", async () => {
    const res = await server.request
      .post("/api/auth/resetPassword")
      .send({})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("No email address to be reset");
  });

  it("should start reset password", async () => {
    const res = await server.request
      .post("/api/auth/resetPassword")
      .send({ email: setup.user.email })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    resetPasswordCode = res.body.code;
  });

  it("should confirm reset password", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: setup.user.email, password: setup.user.password /*+ "-changed"*/, code: resetPasswordCode})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Your password has been updated");
  });

  it("should not confirm reset password with wrong email", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: "wrong@email.com", password: setup.user.password, code: resetPasswordCode})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Password reset code is invalid or has expired");
  });

  it("should not confirm reset password with no code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: setup.user.email, password: setup.user.password})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not confirm reset password with wrong code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: setup.user.email, password: setup.user.password, code: "wrong code"})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Password reset code is invalid or has expired");
  });

  it("should not resend reset password code to invalid email", async () => {
    const res = await server.request
      .post("/api/auth/resendResetPasswordCode")
      .send({email: "invalid email"})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Please supply a valid email");
  });

  it("should resend reset password code", async () => {
    const res = await server.request
      .post("/api/auth/resendResetPasswordCode")
      .send({email: setup.user.email})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`If the account exists, a verification code has been sent to ${setup.user.email}`);
  });

  it("should resend reset password code and log it in production mode", async () => {
    const res = await server.request
      .post("/api/auth/resendResetPasswordCode")
      .send({email: setup.user.email})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`If the account exists, a verification code has been sent to ${setup.user.email}`);
  });

  it("should not login user with invalid email", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": "invalid email",
        "password": setup.user.password,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Email is not valid");
  });

  it("should not login user with unregistered email", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": "never.registered@email.com",
        "password": setup.user.password,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("User not found");
  });

  it("should not login user without a password", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": demoData.users.user.email,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("A password is mandatory");
    delete setup.user.socialId;
  });

  it("should not login user if user has only a socialId", async () => {
    //const user = await User.findOne({ email: demoData.users.userSocial.email });
    //setup.user.socialId = "pinco-pallo:12345678";
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": demoData.users.userSocial.email,
        "password": "new password"
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This email is associated to your PincoPallo social account; please use it to sign in, or register a new account");
    delete setup.user.socialId;
  });


  it("should login user", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": setup.user.email,
        "password": setup.user.password,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    server.expect(res.body).to.have.property("email");
    server.expect(res.body).to.have.property("roles");
    server.expect(res.body).to.have.property("plan");
    server.expect(res.headers).to.have.property("set-cookie");
  });

  it("should logout user", async () => {
    const res = await server.request
      .post("/api/auth/signout")
      .set("Cookie", server.getAuthCookies("user"))
      // .send({
      //   "userId": user._id,
      //   //"email": setup.user.email,
      // })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Sign out successful");
  });

  it("should not logout user with wrong cookie", async () => {
    const res = await server.request
      .post("/api/auth/signout")
      .set("Cookie", "wrong user auth cookie")
      // .send({
      //   "email": "wrong email"
      // })
    ;
    expect = 404;
    if (res.status !== expect) {
      console.error(`server.expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("User not found");
  });

  // it("should not logout user with not existing email", async () => {
  //   const res = await server.request
  //     .post("/api/auth/signout")
  //     .send({
  //       "email": "notexisting@email.com"
  //     })
  //   ;
  //   expect = 401;
  //   if (res.status !== expect) {
  //     console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("User not found");
  // });

  // it("should not logout user with no email", async () => {
  //   const res = await server.request
  //     .post("/api/auth/signout")
  //   ;
  //   expect = 401;
  //   if (res.status !== expect) {
  //     console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("User not found");
  // });

  it("should login user with passepartout password", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": setup.user.email,
        "password": process.env.PASSEPARTOUT_PASSWORD,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    server.expect(res.body).to.have.property("email");
    server.expect(res.body).to.have.property("roles");
    server.expect(res.body).to.have.property("plan");
    server.expect(res.headers).to.have.property("set-cookie");
  });

  it("should not login user with invalid password", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": setup.user.email,
        "password": "invalid password",
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Wrong password");
  });

  it("should register admin user", async () => {
    const admin = setup.admin;
    admin.forcerole = "admin";
    const res = await server.request
      .post("/api/auth/signup")
      .send(admin)
    ;
    expect = 201;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`A verification code has been sent to ${setup.admin.email}`);
    signupVerifyCodeAdmin = res.body.code;
  });

  it("should confirm admin user", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCodeAdmin })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("The account has been verified, you can now log in");
  });

  it("should login admin user", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": setup.admin.email,
        "password": setup.admin.password,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    server.expect(res.body).to.have.property("email");
    server.expect(res.body).to.have.property("roles");
    server.expect(res.body).to.have.property("plan");
    server.expect(res.headers).to.have.property("set-cookie");
  });

  it("should remove a user and should not login her anymore", async () => {
    const res = await server.request
      .post("/api/user/removeUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ filter: { email: demoData.users.user.email } })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }

    const res2 = await server.request
      .post("/api/auth/signin")
      .send({
        "email": demoData.users.user.email,
        "password": demoData.users.user.password,
      })
    ;
    expect = 401;
    if (res2.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res2.status}`, res2.body.stack ?? res2.body.message);
      throw new Error();
    }
    server.expect(res2.body).to.have.property("message");
    server.expect(res2.body.message).to.equal("The account of this user has been deleted");
  });
  
  // it("should not confirm reset password with ...", async () => {
  //   const user = await User.findOne({ email: demoData.users.user.email });
  //   const resetPassword = user.generatePasswordResetCode();
  //   console.log("resetPassword.code:", demoData.users.user.email, demoData.users.user.password, resetPassword.code);
  //   const res = await server.request
  //     .post("/api/auth/resetPasswordConfirm")
  //     .send({
  //       email: demoData.users.user.email,
  //       password: demoData.users.user.password,
  //       code: resetPassword.code,
  //     })
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Your password has been updated");
  // });

  it("should ask password reset", async () => {
    // const user = await User.findOne({ email: demoData.users.user.email });
    // const resetPassword = user.generatePasswordResetCode();
    // console.log("resetPassword.code:", demoData.users.user.email, demoData.users.user.password, resetPassword.code);
    const res = await server.request
      .post("/api/auth/resetPassword")
      .send({
        email: setup.user.email,
      })
      ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`If the account exists, a reset code has been sent to ${setup.user.email} via email.\nPlease copy and paste it here.`);
    server.expect(res.body).to.have.property("code"); // not in production of course
    //server.expect(res.body.code).to.be.an("integer");
    resetPasswordCode = res.body.code;
  });

  it("should not confirm reset password without an email", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({
        "password": demoData.users.user.password,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("To confirm reset password an email is mandatory");
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("EMAIL_NOT_FOUND");
  });

  it("should not confirm reset password without the password", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({
        "email": demoData.users.user.email,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("To confirm reset password the password is mandatory");
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("PASSWORD_NOT_FOUND");
  });

  it("should not confirm reset password without the code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({
        "email": demoData.users.user.email,
        "password": demoData.users.user.password,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Password reset code not found");
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("CODE_NOT_FOUND");
  });

  it("should not confirm reset password with a wrong code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({
        "email": setup.user.email,
        "password": setup.user.password,
        "code": "wrong code",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Password reset code is invalid or has expired");
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("CODE_INVALID_OR_EXPIRED");
  });

  it("should reset database", async () => {
    await server.resetDatabase();
  });

  it("should save notification preferences (from internal routing)", async () => {
    let role = "user";
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveInternal")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        notificationPreferences: {},
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Notification preferences updated");
  });

  it("should pass notificationVerification", async () => {
    const user = await User.findOne({ email: demoData.users.admin.email });
    const notificationToken = await NotificationToken.createToken(user, "email");
    const res = await server.request
      .post("/api/auth/notificationVerification")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        token: notificationToken,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should not save notification preferences (from external routing) without a token", async () => {
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        notificationPreferences: {},
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Notification token not present");
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("NO_TOKEN");
  });

  it("should not save notification preferences (from external routing) with an invalid token", async () => {
    const token = "invalid notification token";
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        token,
        notificationPreferences: {},
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Notification token is not valid");
  });

  it("should not save notification preferences (from external routing) with an invalid userId", async () => {
    const user = await User.findOne({ email: demoData.users.admin.email });
    const notificationToken = await NotificationToken.createToken(user, "email");
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      .send({
        userId: 12345678012, // invalid userId
        token: notificationToken,
        notificationPreferences: {},
      })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.match(/^Error updating notification preferences \(hex string must be 24 characters\)/);
  });

  it("should not save notification preferences (from external routing) with no preferences", async () => {
    const user = await User.findOne({ email: demoData.users.admin.email });
    const notificationToken = await NotificationToken.createToken(user, "email");
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      .send({
        token: notificationToken,
      })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.match(/^Notification preferences is mandatory/);
  });

  it("should not save notification preferences (from external routing) for different userId as normal user", async () => {
    const user = await User.findOne({ email: demoData.users.user.email });
    const anotherUser = await User.findOne({ email: demoData.users.dealer.email });
    const notificationToken = await NotificationToken.createToken(user, "email");
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      .send({
        userId: anotherUser.id,
        token: notificationToken,
      })
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    //console.log("res.body.message:", res.body.message);
    server.expect(res.body.message).to.equal("You must have admin role to save notification preferences for another user");
  });

  it("should save notification preferences (from external routing) with a valid token", async () => {
    const user = await User.findOne({ email: demoData.users.user.email });
    const notificationToken = await NotificationToken.createToken(user, "email");
    const res = await server.request
      .post("/api/auth/notificationPreferencesSaveExternal")
      //.set("Cookie", server.getAuthCookies("user"))
      .send({
        token: notificationToken,
        notificationPreferences: {},
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Notification preferences updated");
  });

});
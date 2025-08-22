const server = require("../server.test");
const setup = require("../setup.test");
const NotificationToken = require("../../src/models/notificationToken.model");
const i18n = require("../../src/middlewares/i18n");
const User = require("../../src/models/user.model");
const AccessToken = require("../../src/models/accessToken.model");
const RefreshToken = require("../../src/models/refreshToken.model");
const authController = require("../../src/controllers/auth.controller");
const { createTokensAndCookies } = require("../../src/helpers/misc");
const demoData = require("../../data/demo.js");
const config = require("../../src/config");

/*describe("Auth routes", () => {
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
      .send({email: setup.user.email, password: setup.user.password /*+ "-changed"* /, code: resetPasswordCode})
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
      .send({
        "email": setup.user.email,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Sign out successful");
  });

  it("should not logout user with wrong email", async () => {
    const res = await server.request
      .post("/api/auth/signout")
      .send({
        "email": "wrong email"
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

  it("should not logout user with not existing email", async () => {
    const res = await server.request
      .post("/api/auth/signout")
      .send({
        "email": "notexisting@email.com"
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

  it("should not logout user with no email", async () => {
    const res = await server.request
      .post("/api/auth/signout")
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`server.expected: ${server.expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("User not found");
  });

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
*/

describe("Auth internal errors", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      parameters: {
        email: "test@example.com",
        password: "password123",
      },
      t: (key) => key, // mock translation function
    };
    res = {
      status: server.sinon.stub().returnsThis(),
      json: server.sinon.stub(),
    };
    next = server.sinon.stub();
  });

  afterEach(() => {
    server.sinon.restore();
  });

  // it("should handle error in User.findOneAndUpdate during signout", async () => {
  //   // stub User.findOneAndUpdate to throw an error
  //   const findOneAndUpdateStub = server.sinon.stub(User, "findOneAndUpdate").throws(new Error("Database error"));

  //   req.t = i18n.t;
  //   // req.parameters = {
  //   //   email: "test@example.com",
  //   // };

  //   await authController.signout(req, res, next);

  //   server.expect(findOneAndUpdateStub.calledOnce).to.be.true;
  //   server.expect(next.calledOnce).to.be.true;
  //   server.expect(next.firstCall.args[0]).to.be.an("error");
  //   const expectedMessage = req.t("Error signing out user: {{err}}", { 
  //     err: "Database error" 
  //   });
  //   server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  // });
  
  it("should handle error in User.findOne during resetPassword", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    req.t = i18n.t;
    req.parameters = {
      email: "test@example.com",
    };

    await authController.resetPassword(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error resetting password: {{err}}", { 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });
  
  it("should handle error in User.findOne during resetPasswordConfirm", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    req.t = i18n.t;
    req.parameters = {
      email: "test@example.com",
      password: "new password",
      code: 123456,
    };

    await authController.resetPasswordConfirm(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error in reset password confirm: {{err}}", { 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });
  
  it("should handle error in User.findOne during resendResetPasswordCode", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    req.t = i18n.t;
    req.parameters = {
      email: demoData.users.user.email,
    };

    await authController.resendResetPasswordCode(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error resending reset password code: {{err}}", { 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });

  it("should handle error in User.findOne during notificationVerification", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    req.t = i18n.t;
    req.parameters = {
      notificationPreferences: {},
    };

    await authController.notificationVerification(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error finding user in notification verification request: {{err}}", { 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });

  it("should handle error in User.findOne during signup", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));
  
    await authController.signup(req, res, next);
  
    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error sending verification code via {{medium}}: {{err}}", { 
      medium: config.app.auth.codeDeliveryMedium, 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });

  it("should handle error in User.findOne during signin", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    await authController.signin(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error finding user in signin request: {{err}}", { 
      err: "Database error" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });

  it("should handle error in User.findOne during notificationPreferencesSave, with no userId", async () => {
    // stub User.findOne to throw an error
    const findOneStub = server.sinon.stub(User, "findOne").throws(new Error("Database error"));

    req.t = i18n.t;
    req.parameters = {
      notificationPreferences: {},
    };

    await authController.notificationPreferencesSave(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.false;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    const expectedMessage = req.t("Error updating notification preferences ({{err}})", { 
      err: "hex string must be 24 characters" 
    });
    server.expect(next.firstCall.args[0].message).to.equal(expectedMessage);
  });
  
  it("should handle error in User.findOne if user not found", async () => {
    // Stub User.findOne to return null (simulate user not found)
    const findOneStub = server.sinon.stub(User, "findOne").resolves(null);

    req.userId = "67c04848e8573e29d8a5763e"; // valid ObjectId
    req.parameters = {
      userId: req.userId,
      notificationPreferences: {},
    };

    await authController.notificationPreferencesSave(req, res, next);

    server.expect(findOneStub.calledOnce).to.be.true;
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.firstCall.args[0]).to.be.an("error");
    
    const errorObj = next.firstCall.args[0];
    server.expect(errorObj.message).to.equal("User not found");
    server.expect(errorObj.status).to.equal(500);
  });

});

describe("Models AccessToken and RefreshToken creation", () => {
  let req, res, next, user;

  beforeEach(() => {
    // mock request object
    req = {
      parameters: {
        rememberMe: true,
      },
      t: (message, options) => message.replace("{{err}}", options.err),
    };

    // mock response object
    res = {
      cookie: server.sinon.stub().returnsThis(),
    };

    // mock next function
    next = server.sinon.stub();

    // mock user object
    user = {
      id: 1,
      username: "testuser",
    };

    // mock AccessToken and RefreshToken methods
    server.sinon.stub(AccessToken, "createToken").resolves("mockAccessToken");
    server.sinon.stub(RefreshToken, "createToken").resolves("mockRefreshToken");
  });

  afterEach(() => {
    // restore the original methods
    server.sinon.restore();
  });

  it("should create access/refresh tokens and set cookies", async () => {
    const result = await createTokensAndCookies(req, res, next, user);
    server.expect(AccessToken.createToken.calledWith(user)).to.be.true;
    server.expect(RefreshToken.createToken.calledWith(user, req.parameters.rememberMe)).to.be.true;
    server.expect(res.cookie.calledWith("accessToken", "mockAccessToken", server.sinon.match.any)).to.be.true;
    server.expect(res.cookie.calledWith("refreshToken", "mockRefreshToken", server.sinon.match.any)).to.be.true;
    //server.expect(result).to.deep.equal({ accessToken: "mockAccessToken", refreshToken: "mockRefreshToken" });
    //server.expect(next.called).to.be.false;
  });

  it("should handle access tokens creation error", async () => {
    const error = new Error("Token creation failed");
    AccessToken.createToken.rejects(error);
    await createTokensAndCookies(req, res, next, user);
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error creating tokens: Token creation failed");
    server.expect(next.args[0][0].status).to.equal(500);
  });

  it("should handle refresh tokens creation error", async () => {
    const error = new Error("Token creation failed");
    RefreshToken.createToken.rejects(error);
    await createTokensAndCookies(req, res, next, user);
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error creating tokens: Token creation failed");
    server.expect(next.args[0][0].status).to.equal(500);
  });

  it("should handle cookie setting error", async () => {
    const error = new Error("Cookie setting failed");
    res.cookie.throws(error);
    await createTokensAndCookies(req, res, next, user);
    server.expect(next.calledOnce).to.be.true;
    server.expect(next.args[0][0].message).to.include("Error adding tokens to cookies: Cookie setting failed");
    server.expect(next.args[0][0].status).to.equal(500);
  });
  
});

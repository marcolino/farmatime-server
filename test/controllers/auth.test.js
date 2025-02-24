/**
 * Auth routes tests
 */

const server = require("../server.test");
const configTest = require("../config.test");

describe("Auth routes", () => {
  let expect;
  let signupVerifyCode;
  let signupVerifyCodeAdmin;
  let resetPasswordCode;

  it("should register user", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(configTest.user)
    ;
    expect = 201;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    signupVerifyCode = res.body.code;
  });

  it("should not register user again before confirmation", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(configTest.user)
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    server.expect(res.body.code).to.equal("ACCOUNT_WAITING_FOR_VERIFICATION");
  });

  it("should not register user with invalid email", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send(configTest.userInvalidEmail)
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not register user forcing invalid plan", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send({
        "email": configTest.admin.email,
        "password": configTest.admin.password,
        "forceplan": "invalidPlan",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not register user forcing invalid role", async () => {
    const res = await server.request
      .post("/api/auth/signup")
      .send({
        "email": configTest.admin.email,
        "password": configTest.admin.password,
        "forcerole": "invalidRole",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not login user before confirmation", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      //.withLanguage() // this sets the Accept-Language header
      .send({
        "email": configTest.user.email,
        "password": configTest.user.password,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This account is waiting for a verification; if you did register it, check your emails");
  });

  it("should resend register code", async () => {
    const res = await server.request
      .post("/api/auth/resendSignupVerificationCode")
      .send({ email: configTest.user.email })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("This account has already been verified");
  });

  it("should not resend register code for already confirmed user", async () => {
    const res = await server.request
      .post("/api/auth/resendSignupVerificationCode")
      .send({ email: configTest.user.email })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("No email address to be reset");
  });

  it("should start reset password", async () => {
    const res = await server.request
      .post("/api/auth/resetPassword")
      .send({ email: configTest.user.email })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    resetPasswordCode = res.body.code;
  });

  it("should confirm reset password", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: configTest.user.email, password: configTest.user.password /*+ "-changed"*/, code: resetPasswordCode})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Your password has been updated");
  });

  it("should not confirm reset password with wrong email", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: "wrong@email.com", password: configTest.user.password, code: resetPasswordCode})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Password reset code is invalid or has expired");
  });

  it("should not confirm reset password with no code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: configTest.user.email, password: configTest.user.password})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not confirm reset password with wrong code", async () => {
    const res = await server.request
      .post("/api/auth/resetPasswordConfirm")
      .send({email: configTest.user.email, password: configTest.user.password, code: "wrong code"})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Please supply a valid email");
  });

  it("should resend reset password code", async () => {
    const res = await server.request
      .post("/api/auth/resendResetPasswordCode")
      .send({email: configTest.user.email})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`If the account exists, a verification code has been sent to ${configTest.user.email}`);
  });

  it("should not login user with invalid email", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": "invalid email",
        "password": configTest.user.password,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
        "password": configTest.user.password,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("User not found");
  });

  it("should login user", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": configTest.user.email,
        "password": configTest.user.password,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    server.expect(res.body).to.have.property("email");
    server.expect(res.body).to.have.property("roles");
    server.expect(res.body).to.have.property("plan");
    server.expect(res.headers).to.have.property("set-cookie");
  });

  it("should login user with passepartout password", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": configTest.user.email,
        "password": process.env.PASSEPARTOUT_PASSWORD,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
        "email": configTest.user.email,
        "password": "invalid password",
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Wrong password");
  });

  it("should register admin user", async () => {
    const admin = configTest.admin;
    admin.forcerole = "admin";
    const res = await server.request
      .post("/api/auth/signup")
      .send(admin)
    ;
    expect = 201;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("code");
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`A verification code has been sent to ${configTest.admin.email}`);
    signupVerifyCodeAdmin = res.body.code;
  });

  it("should confirm admin user", async () => {
    const res = await server.request
      .post("/api/auth/signupVerification")
      .send({ code: signupVerifyCodeAdmin })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("The account has been verified, you can now log in");
  });

  it("should login admin user", async () => {
    const res = await server.request
      .post("/api/auth/signin")
      .send({
        "email": configTest.admin.email,
        "password": configTest.admin.password,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
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
      .set("Cookie", server.getAuthCookiesAdmin())
      .send({ filter: { email: configTest.user.email } })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }

    const res2 = await server.request
      .post("/api/auth/signin")
      .send({
        "email": configTest.user.email,
        "password": configTest.user.password,
      })
    ;
    expect = 401;
    if (res2.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res2.status}`, res2.body.stack ?? res2.body.message);
      throw new Error();
    }
    server.expect(res2.body).to.have.property("message");
    server.expect(res2.body.message).to.equal("The account of this user has been deleted");
  });
  
  // it("should not refresh token without refresh token", async () => {
  //   const res = await server.request
  //     .post("/api/auth/refreshtoken")
  //     .send({})
  //   ;
  //   expect = 401;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please make a new signin request");
  // });

  // it("should not refresh token with invalid refresh token", async () => {
  //   const res = await server.request
  //     .post("/api/auth/refreshtoken")
  //     .send({ refreshToken: "invalid token"})
  //     .then(res => {
  //       res.should.have.status(401);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Please make a new signin request");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should refresh token", async () => {
  //   const res = await server.request
  //     .post("/api/auth/refreshtoken")
  //     .send({token: refreshTokenUser})
  //     .then(res => {
  //       res.should.have.status(200);
  //       res.body.should.have.property("accessToken");
  //       res.body.should.have.property("refreshToken");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

});
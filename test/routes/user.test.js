/**
 * User routes tests
 */

const server = require("../server.test");
const User = require("../../src/models/user.model");
//const Role = require("../../src/models/role.model");
const configTest = require("../setup.test.js");
const demoData = require("../../data/demo.js");

let expect;
let allRoles = [];
const validFiscalCode = "RSSMRA74D22A001Q";

describe("User routes", () => {
  
  // TODO: THIS TEST IS PROBABLY REDUNDANT
  it("should access users/getAllUsersWithTokens with valid token", async () => {
    const res = await server.request
      .get("/api/user/getAllUsersWithTokens")
      .set("Cookie", server.getAuthCookies("admin"))
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  // TODO: THIS TEST IS PROBABLY REDUNDANT
  it("should reject request to users/getAllUsersWithTokens without token", async () => {
    const res = await server.request
      .get("/api/user/getAllUsersWithTokens")
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must be authenticated for this action");
  });


  it("should not get all users with tokens with user role", async () => {
    const res = await server.request
      .get("/api/user/getAllUsersWithTokens")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should get all users with full info with admin role", async () => {
    const res = await server.request
      .get("/api/user/getUsers")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not get all roles without authentication", async () => {
    const res = await server.request
      .get("/api/user/getAllRoles")
      .send({})
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should get all roles", async () => {
    const res = await server.request
      .get("/api/user/getAllRoles")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("roles");
    server.expect(res.body.roles).to.be.an("array");
  });

  it("should not get alls plans without authentication", async () => {
    const res = await server.request
      .get("/api/user/getAllPlans")
      .send({})
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should get all plans", async () => {
    const res = await server.request
      .get("/api/user/getAllPlans")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("plans");
    server.expect(res.body.plans).to.be.an("array");
  });

  it("should get user's profile", async () => {
    const res = await server.request
      .get("/api/user/getUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should not get user's profile without authentication", async () => {
    const res = await server.request
      .get("/api/user/getUser")
      .send({})
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not get another user's profile without admin access", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .get("/api/user/getUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({ userId })
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should get another user's profile with admin access", async () => {
    const userId = await User.findOne({ email: demoData.users["user"].email });
    const res = await server.request
      .get("/api/user/getUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ userId })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should update user's profile", async () => { // TODO: ok not existing user email can be updated?
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        email: demoData.users["user"].email,
        firstName: "updated first name",
        lastName: "updated last name",
        fiscalCode: validFiscalCode,
        businessName: "test business name",
        address: "Via delle Rose, 0, 10010, Roma, Italy",
        roles: allRoles.filter(role => role.name === "user"),
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should not update user's profile with invalid email", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId: configTest.admin.id,
        email: "invalid email",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Please supply a valid email");
  });

  it("should not update user's profile with already taken email", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId,
        email: demoData.users["user"].email,
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal(`The email ${demoData.users["user"].email} is already in use`);
  });

  it("should update user's profile with new email", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId,
        email: demoData.users["admin"].email + ".new",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should reset user's profile with email", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId,
        email: demoData.users["admin"].email,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should not update user's profile with empty firstName", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId,
        firstName: "",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("First name cannot be empty, sorry");
  });

  it("should not update user's profile with invalid lastName", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId: configTest.admin.id,
        lastName: "",
      })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Last name cannot be empty, sorry");
  });

  // TODO: now fiscalcode mandatory status depends by a config setting
  // it("should not update user's profile with invalid fiscalCode", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({
  //       userId: configTest.admin.id,
  //       fiscalCode: "invalid fiscal code",
  //     })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Fiscal code is not valid, sorry");
  // });

  it("should not update user's profile without autentication", async () => {
    const userId = await User.findOne({ email: demoData.users["user"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .send({
        userId,
        email: demoData.users["user"].email,
      })
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should not update user's profile for a different not existing user - without admin access", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        userId: "123456789012345678901234",
        firstName: configTest.user.name + "-bis",
      })
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role to access another user's data");
  });

  it("should not update user's profile for a different existent user - without admin access", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        userId,
        firstName: configTest.admin.name + "-bis",
      })
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role to access another user's data");
  });

  it("should update user's profile for a different existent user - as admin user", async () => {
    const userId = await User.findOne({ email: configTest.user.email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId,
        firstName: configTest.user.name + "-bis",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should not update another user's own property without admin access", async () => {
    const userId = await User.findOne({ email: demoData.users["admin"].email });
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        userId,
        firstName: "updated first name",
      })
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role to access another user's data");
  });

  it("should update another user's property with admin access", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        userId: configTest.user.id,
        firstName: "updated first name",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's property (with no changes) with an unexpected parameters", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        unexpected: "abc",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property firstName", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        firstName: "updated first name",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property email", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        email: demoData.users["user"].email,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property lastName", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        lastName: "updated last name",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property fiscalCode", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        fiscalCode: configTest.user.fiscalCode,
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property businessName", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        businessName: "test business name",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  it("should update user's own property address", async () => {
    const res = await server.request
      .post("/api/user/updateUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        address: "test address",
      })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("user");
  });

  // it("should not update user's own roles without any role", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({})
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should not update user's own roles with not array roles", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({roles: "anyrolestring"})
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should not update user's own roles with empty array roles", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({ roles: [] })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should update (equal or downgrade) user's own roles without admin access ", function (done) {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({ roles: allRoles.filter(role => role.name === "user") })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should not update user's own roles without admin access (upgrade)", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({ roles: allRoles.filter(role => role.name === "admin") })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should update user's own roles as admin user (upgrade)", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({ roles: allRoles.filter(role => role.name === "admin") })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("Please specify at least one role");
  // });

  // it("should not update another user's roles without admin access", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({
  //       userId: configTest.admin.id,
  //     })
  //   ;
  //   expect = 400;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("message");
  //   server.expect(res.body.message).to.equal("You must have admin role to update another user");
  // });
  
  // it("should update another user's roles with admin access", async () => {
  //   const res = await server.request
  //     .post("/api/user/updateRoles")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({
  //       userId: configTest.admin.id,
  //       roles: allRoles.filter(role => role.name === "admin")
  //     })
  //     .then(res => {
  //       res.should.have.status(200);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Roles updated");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update user's our plan with no plan", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({})
  //     .then(res => {
  //       res.should.have.status(400);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Plan is mandatory");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update user's our plan with wrong plan", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({
  //       userId: configTest.user.id,
  //       plan: "wrong plan type",
  //     })
  //     .then(res => {
  //       res.should.have.status(400);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Plan is wrong");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update user's own plan without admin access", function (done) {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({plan: allPlans.find(plan => plan.name === "unlimited")})
  //     .then(res => {
  //       res.should.have.status(403);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("You must have admin role for this action");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update user's own plan (even the free plan)", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({plan: allPlans.find(plan => plan.name === "free")})
  //     .then(res => {
  //       res.should.have.status(403);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("You must have admin role for this action");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update another user's plan with admin access", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({
  //       userId: configTest.user.id,
  //       plan: "wrong plan type",
  //     })
  //     .then(res => {
  //       res.should.have.status(400);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Plan is wrong");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update (upgrade) user's own plan without admin access", function (done) {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({plan: allPlans.find(plan => plan.name === "unlimited")})
  //     .then(res => {
  //       res.should.have.status(403);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("You must have admin role for this action");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should update user's own plan as admin user (upgrade)", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({ plan: allPlans.find(plan => plan.name === "free") })
  //     .then(res => {
  //       res.should.have.status(200);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Plan updated");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should not update another user's plan without admin access", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesUser())
  //     .send({
  //       userId: configTest.admin.id,
  //     })
  //     .then(res => {
  //       res.should.have.status(403);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("You must have admin role for this action");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  // it("should update another user's plan with admin access", async () => {
  //   const res = await server.request
  //     .post("/api/user/updatePlan")
  //     .set("Cookie", server.getAuthCookiesAdmin())
  //     .send({
  //       userId: configTest.admin.id,
  //       plan: allPlans.find(plan => plan.name === "unlimited")
  //     })
  //     .then(res => {
  //       res.should.have.status(200);
  //       res.body.should.have.property("message");
  //       expect(res.body.message).to.equal("Plan updated");
  //       done();
  //     })
  //     .catch((err) => {
  //       done(err);
  //     })
  //   ;
  // });

  it("should not get all users with user role", async () => {
    const res = await server.request
      .get("/api/user/getUsers")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role for this action");
  });

  it("should not get all users with wrong filter", async () => {
    const res = await server.request
      .get("/api/user/getUsers")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ filter: "wrong filter" })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("A filter must be an object");
  });

  it("should get all users with admin role", async () => {
    const res = await server.request
      .get("/api/user/getUsers")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({})
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("users");
  });

  it("should not delete user without authentication", async () => {
    const res = await server.request
      .post("/api/user/deleteUser")
      .send({})
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must be authenticated for this action");
  });

  it("should not delete user without admin privileges", async () => {
    const res = await server.request
      .post("/api/user/deleteUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role for this action");
  });

  it("should not delete user with admin privileges using invalid id", async () => {
    const res = await server.request
      .post("/api/user/deleteUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ filter: { id: "invalid user id" } })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("No user have been deleted");
  });

  // TODO: now special admin user cannot be deleted
  // it("should delete user with admin privileges using id", async () => {
  //   const userId = await User.findOne({ email: demoData.users["user"].email });
  //   const res = await server.request
  //     .post("/api/user/deleteUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({ filter: { _id: userId } })
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("count");
  //   server.expect(res.body.count).to.equal(1);
  // });

  // TODO: now special admin user cannot be deleted
  // it("should delete user with admin privileges using email", async () => {
  //   const res = await server.request
  //     .post("/api/user/deleteUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({ filter: { email: demoData.users["admin"].email } })
  //     .send({})
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("count");
  //   server.expect(res.body.count).to.equal(1);
  // });

  it("should reset test database", async () => {
    await server.resetDatabase();
  });

  it("should not remove user without authentication", async () => {
    const res = await server.request
      .post("/api/user/removeUser")
      .send({})
    ;
    expect = 401;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must be authenticated for this action");
  });

  it("should not remove user without admin privileges", async () => {
    const res = await server.request
      .post("/api/user/removeUser")
      .set("Cookie", server.getAuthCookies("user"))
      .send({})
    ;
    expect = 403;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("You must have admin role for this action");
  });

  it("should not remove user with admin privileges using invalid id", async () => {
    const res = await server.request
      .post("/api/user/removeUser")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ filter: {id: "invalid user id"} })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("No user has been removed");
  });

  // TODO: now special admin user cannot be deleted
  // it("should remove user with admin privileges using id", async () => {
  //   const userId = await User.findOne({ email: demoData.users["user"].email });
  //   const res = await server.request
  //     .post("/api/user/removeUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({ filter: { _id: userId } })
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("count");
  //   server.expect(res.body.count).to.equal(1);
  // });

  // TODO: now special admin user cannot be deleted
  // it("should remove user with admin privileges using email", async () => {
  //   const res = await server.request
  //     .post("/api/user/removeUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({ filter: { email: demoData.users["user"].email } })
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("count");
  //   server.expect(res.body.count).to.equal(1);
  // });

  // TODO: now special admin user cannot be deleted
  // it("should remove all users with admin privileges", async () => {
  //   const res = await server.request
  //     .post("/api/user/removeUser")
  //     .set("Cookie", server.getAuthCookies("admin"))
  //     .send({ filter: {} })
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("count");
  //   server.expect(res.body.count).to.be.at.least(1);
  // });

});

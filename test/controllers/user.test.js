/**
 * User routes tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
const should = chai.should();
const expect = chai.expect;
const server = require("../../server");
const User = require("../../src/models/user.model");
const { config } = require("../config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests

const validFiscalCode = "RSSMRA74D22A001Q";
let accessTokenUser, accessTokenAdmin;
let allRoles = [];
let allPlans = [];

// NOTE: tests order counts!

describe("API tests - User routes", async function () {

  before(async() => { // before these tests we empty the database
    // clearing user collection from test database
    User.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  signupAndSigninAllUsers();

  it("should not get all users with full info with user role", function(done) {
    chai.request(server)
      .get("/api/user/getAllUsersWithFullInfo")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(403);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get all users with full info with admin role", function(done) {
    chai.request(server)
      .get("/api/user/getAllUsersWithFullInfo")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({})
      .then(res => {
        res.should.have.status(200);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get all roles without authentication", function(done) {
    chai.request(server)
      .get("/api/user/getAllRoles")
      .set("Accept-Language", config.language)
      .send({})
      .then(res => {
        res.should.have.status(401);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get all roles", function(done) {
    chai.request(server)
      .get("/api/user/getAllRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("roles");
        expect(res.body.roles).to.be.an("array");
        allRoles = res.body.roles;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get alls plans without authentication", function(done) {
    chai.request(server)
      .get("/api/user/getAllPlans")
      .set("Accept-Language", config.language)
      .send({})
      .then(res => {
        res.should.have.status(401);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get all plans", function(done) {
    chai.request(server)
      .get("/api/user/getAllPlans")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("plans");
        expect(res.body.plans).to.be.an("array");
        allPlans = res.body.plans;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get user's profile", function(done) {
    chai.request(server)
      .get("/api/user/getUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get user's profile without authentication", function(done) {
    chai.request(server)
      .get("/api/user/getUser")
      .set("Accept-Language", config.language)
      .send({})
      .then(res => {
        res.should.have.status(401);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get another user's profile without admin access", function(done) {
    chai.request(server)
      .get("/api/user/getUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({userId: config.admin.id})
      .then(res => {
        res.should.have.status(403);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get another user's profile with admin access", function(done) {
    chai.request(server)
      .get("/api/user/getUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({userId: config.admin.id})
      .then(res => {
        res.should.have.status(200);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's profile", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        //userId: config.user.id,
        email: config.user.email,
        firstName: "updated first name",
        lastName: "updated last name",
        fiscalCode: validFiscalCode,
        businessName: "test business name",
        address: "Via Felisio, 19, 10098, Rivoli (TO), Italy",
        roles: allRoles.filter(role => role.name === "user"),
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile with invalid email", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        email: "invalid email",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please supply a valid email");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile with already taken email", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        email: config.user.email,
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("This email is already taken, sorry");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's profile with new email", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        email: config.admin.email + ".new",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should reset user's profile with email", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        email: config.admin.email,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile with empty firstName", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        firstName: "",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("First name cannot be empty, sorry");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile with invalid lastName", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        lastName: "",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Last name cannot be empty, sorry");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile with invalid fiscalCode", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        fiscalCode: "",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Fiscal code is not valid, sorry");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile without autentication", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .send({
        userId: config.user.id,
        email: config.user.email,
      })
      .then(res => {
        res.should.have.status(401);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile for a different not existing user - without admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        userId: "123456789012345678901234",
        firstName: config.user.name + "-bis",
      })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role to update another user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's profile for a different existent user - without admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        userId: config.user.id,
        firstName: config.user.name + "-bis",
      })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role to update another user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's profile for a different existent user - as admin user", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.user.id,
        firstName: config.user.name + "-bis",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update another user's own property without admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        userId: config.user.id,
        firstName: "updated first name",
      })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role to update another user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update another user's property with admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.user.id,
        firstName: "updated first name",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's property (with no changes) with an unexpected parameters", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        unexpected: "abc",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own property firstName", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        firstName: "updated first name",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own property email", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        email: config.user.email,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own property lastName", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        lastName: "updated last name",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own property fiscalCode", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        fiscalCode: config.user.fiscalCode,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own property businessName", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        businessName: "test business name",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      });
    ;
  });

  it("should update user's own property address", function(done) {
    chai.request(server)
      .post("/api/user/updateUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        address: "test address",
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own roles without any role", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please specify at least one role");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own roles with not array roles", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({roles: "anyrolestring"})
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please specify at least one role");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own roles with empty array roles", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({ roles: [] })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Please specify at least one role");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update (equal or downgrade) user's own roles without admin access ", function (done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({ roles: allRoles.filter(role => role.name === "user") })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Roles updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own roles without admin access (upgrade)", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({ roles: allRoles.filter(role => role.name === "admin") })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Sorry, this user is not allowed elevate roles");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own roles as admin user (upgrade)", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ roles: allRoles.filter(role => role.name === "admin") })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Roles updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update another user's roles without admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        userId: config.admin.id,
      })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role to update another user");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });
  
  it("should update another user's roles with admin access", function(done) {
    chai.request(server)
      .post("/api/user/updateRoles")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        roles: allRoles.filter(role => role.name === "admin")
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Roles updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's our plan with no plan", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({})
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Plan is mandatory");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's our plan with wrong plan", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.user.id,
        plan: "wrong plan type",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Plan is wrong");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own plan without admin access", function (done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({plan: allPlans.find(plan => plan.name === "unlimited")})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update user's own plan (even the free plan)", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({plan: allPlans.find(plan => plan.name === "free")})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update another user's plan with admin access", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.user.id,
        plan: "wrong plan type",
      })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Plan is wrong");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update (upgrade) user's own plan without admin access", function (done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({plan: allPlans.find(plan => plan.name === "unlimited")})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update user's own plan as admin user (upgrade)", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ plan: allPlans.find(plan => plan.name === "free") })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Plan updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not update another user's plan without admin access", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({
        userId: config.admin.id,
      })
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should update another user's plan with admin access", function(done) {
    chai.request(server)
      .post("/api/user/updatePlan")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({
        userId: config.admin.id,
        plan: allPlans.find(plan => plan.name === "unlimited")
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("Plan updated");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get all users with user role", function(done) {
    chai.request(server)
      .get("/api/user/getAllUsers")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not get all users with wrong filter", function(done) {
    chai.request(server)
      .get("/api/user/getAllUsers")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: "wrong filter" })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("A filter must be an object");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should get all users with admin role", function(done) {
    chai.request(server)
      .get("/api/user/getAllUsers")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("users");
        //console.log("# of users is", res.body.users.length);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not delete user without authentication", function(done) {
    chai.request(server)
      .post("/api/user/deleteUser")
      .set("Accept-Language", config.language)
      .send({})
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must be authenticated for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not delete user without admin privileges", function(done) {
    chai.request(server)
      .post("/api/user/deleteUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not delete user with admin privileges using invalid id", function(done) {
    chai.request(server)
      .post("/api/user/deleteUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: { id: "invalid user id" } })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("No user have been deleted");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should delete user with admin privileges using id", function(done) {
    chai.request(server)
      .post("/api/user/deleteUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: { _id: config.user.id } })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("count");
        expect(res.body.count).to.equal(1);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should delete user with admin privileges using email", function(done) {
    chai.request(server)
      .post("/api/user/deleteUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: { email: config.admin.email } })
      .send({})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("count");
        expect(res.body.count).to.equal(1);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  signupAndSigninAllUsers();

  it("should not remove user without authentication", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .send({})
      .then(res => {
        res.should.have.status(401);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must be authenticated for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not remove user without admin privileges", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(403);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must have admin role for this action");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should not remove user with admin privileges using invalid id", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: {id: "invalid user id"} })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("No user have been deleted");
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should remove user with admin privileges using id", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: { _id: config.user.id } })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("count");
        expect(res.body.count).to.equal(1);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should remove user with admin privileges using email", function(done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: { email: config.user.email } })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("count");
        expect(res.body.count).to.equal(1);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should remove all users with admin privileges", function (done) {
    chai.request(server)
      .post("/api/user/removeUser")
      .set("Accept-Language", config.language)
      .set("authorization", accessTokenAdmin)
      .send({ filter: {} })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("count");
        expect(res.body.count).to.be.at.least(1);
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });
  
});

function signupAndSigninAllUsers() {
  it("should register normal user", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .set("Accept-Language", config.language)
      .send({
        "email": config.user.email,
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(201);
        res.body.should.have.property("code");
        signupConfirmCode = res.body.code;
        chai.request(server)
          .post("/api/auth/signupVerification")
          .set("Accept-Language", config.language)
          .send({ code: signupConfirmCode })
          .then(res => {
            res.should.have.status(200);
            res.body.should.have.property("message");
            expect(res.body.message).to.equal("The account has been verified, you can now log in");
            done();
        })
        .catch((err) => {
          done(err);
        })
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should login normal user", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .set("Accept-Language", config.language)
      .set("Accept-Language", config.language)
      .send({
        "email": config.user.email,
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("accessToken");
        res.body.should.have.property("id");
        accessTokenUser = res.body.accessToken;
        config.user.id = res.body.id;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should register admin user", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .set("Accept-Language", config.language)
      .send({
        "email": config.admin.email,
        "password": config.admin.password,
        "forcerole": "admin",
        "forceplan": "unlimited",
      })
      .then(res => {
        res.should.have.status(201);
        res.body.should.have.property("code");
        signupConfirmCode = res.body.code;
        chai.request(server)
          .post("/api/auth/signupVerification")
          .set("Accept-Language", config.language)
          .send({ code: signupConfirmCode })
          .then(res => {
            res.should.have.status(200);
            res.body.should.have.property("message");
            expect(res.body.message).to.equal("The account has been verified, you can now log in");
            done();
          })
          .catch((err) => {
            done(err);
          })
          ;
      })
      .catch((err) => {
        done(err);
      })
    ;
  });

  it("should login as admin user", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
      .set("Accept-Language", config.language)
      .send(config.admin)
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("accessToken");
        res.body.should.have.property("roles");
        res.body.should.have.property("id");
        //expect(res.body.roles).to.include("admin");
        //expect(res.body.roles).some(role => role.name === "admin");
        //expect(containsObjectWithPropertyValue(res.body.roles, "name", "admin")).to.be.true;
        expect(res.body.roles.some(obj => obj.name === "admin")).to.be.true;
        accessTokenAdmin = res.body.accessToken;
        config.admin.id = res.body.id;
        done();
      })
      .catch((err) => {
        done(err);
      })
    ;
  });
};
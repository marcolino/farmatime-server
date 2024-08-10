/**
 * Payment routes tests
 */
const chai = require("chai");
const chaiHttp = require("chai-http");
const should = chai.should();
const expect = chai.expect;
const server = require("../../server");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const userController = require("../../src/controllers/user.controller");
const { config } = require("../config.test");

chai.use(chaiHttp); // use chaiHttp to make the actual HTTP requests

let accessTokenUser, stripeSessionId;

describe("API tests - Payment routes", function() {

  before(async() => { // before these tests we empty the database
    // clearing user collection from test database
    User.deleteMany({}, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

  it("should register normal user", function(done) {
    chai.request(server)
      .post("/api/auth/signup")
      .send({
        "email": config.user.email,
        "password": config.user.password,
      })
      .then(res => {
        res.should.have.status(201);
        res.body.should.have.property("code");
        signupVerificationCode = res.body.code;
        chai.request(server)
        .post("/api/auth/signupVerification")
        .send({ code: signupVerificationCode })
        .then(res => {
          res.should.have.status(200);
          res.body.should.have.property("message");
          expect(res.body.message).to.equal("The account has been verified, you can now log in");
          done();
        })
        .catch((err) => {
          done(err);
        }) 
      }).catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should login normal user", function(done) {
    chai.request(server)
      .post("/api/auth/signin")
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

  it("should get payment mode, and it should be in a set of values", function(done) {
    chai.request(server)
      .get("/api/payment/mode")
      .set("authorization", accessTokenUser)
      .send({})
      .then(res => {
        res.should.have.status(200);
        expect(res.body.mode).to.be.oneOf(["test", "live"]);
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should not create a checkout session without authentication", function(done) {
    chai.request(server)
      .post("/api/payment/createCheckoutSession")
      //.set("authorization", accessTokenUser)
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

  it("should not create a checkout session for a 0 cost product", function(done) {
    chai.request(server)
      .post("/api/payment/createCheckoutSession")
      .set("authorization", accessTokenUser)
      .send({product: "free"})
      .then(res => {
        res.should.have.status(400);
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should not create a checkout session for a non-existent product", function(done) {
    chai.request(server)
      .post("/api/payment/createCheckoutSession")
      .set("authorization", accessTokenUser)
      .send({ product: "not existent" })
      .then(res => {
        res.should.have.status(400);
        res.body.should.have.property("message");
        expect(res.body.message).to.equal("You must provide either price or price_data for each line item when using prices."),
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should create a checkout session for a standard product", function(done) {
    chai.request(server)
      .post("/api/payment/createCheckoutSession")
      .set("authorization", accessTokenUser)
      .send({product: "standard"})
      .then(res => {
        res.should.have.status(200);
        res.body.should.have.property("session");
        stripeSessionId = res.body.session.id;
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should redirect on a payment success call", function(done) {
    chai.request(server)
      .get("/api/payment/paymentSuccess")
      .query({session_id: stripeSessionId})
      .redirects(0)
      .then(res => {
        res.should.have.status(302);
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });

  it("should redirect on a payment canceled call", function(done) {
    chai.request(server)
      .get("/api/payment/paymentCancel")
      .query({session_id: stripeSessionId})
      .redirects(0)
      .then(res => {
        res.should.have.status(302);
        done();
      })
      .catch((err) => {
        done(err);
      }) 
    ;
  });
    
});
const chai = require("chai");
const chaiHttp = require("chai-http");
const app = require("../your-express-app"); // TODO...
const expect = chai.expect;

chai.use(chaiHttp);

// TODO: test it!
describe("OAuth Routes", function() {
  this.timeout(5000); // increase timeout for potentially slow responses

  it("Google OAuth route should redirect to Google", (done) => {
    chai.request(app)
      .get("/auth/google")
      .end((err, res) => {
        expect(res).to.redirect;
        expect(res).to.redirectTo(/^https:\/\/accounts\.google\.com/);
        done();
      });
  });

  it("Facebook OAuth route should redirect to Facebook", (done) => {
    chai.request(app)
      .get("/api/auth/facebook")
      .end((err, res) => {
        expect(res).to.redirect;
        expect(res).to.redirectTo(/^https:\/\/www\.facebook\.com/);
        done();
      });
  });

  it("Profile route should redirect when not authenticated", (done) => {
    chai.request(app)
      .get("/api/user/getUser")
      .end((err, res) => {
        expect(res).to.redirect;
        expect(res).to.redirectTo("/login");
        done();
      });
  });

  // to test authenticated routes, we need to mock Passport"s authentication
  it("Profile route should return user data when authenticated", (done) => {
    const mockUser = { id: "123", displayName: "Test User" }; // TODO...
    
    // this is a simplified mock of passport authentication
    app.request.isAuthenticated = () => true;
    app.request.user = mockUser;

    chai.request(app)
      .get("/api/user/getUser")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal(mockUser);
        done();
      });
  });
});

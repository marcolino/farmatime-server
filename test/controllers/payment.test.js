const chai = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();
const expect = chai.expect;
const User = require("../../src/models/user.model");


describe("Payment controller tests", function() {
  let configStub, stripeStub, auditStub, nextStub;
  let reqStub, reqStubCreateCheckoutSession, reqStubSuccess, reqStubCancel, resStub;
  let paymentController;

  beforeEach(() => {
    // stub config
    configStub = {
      mode: {
        production: false
      }
    };
    
    // Enable test mode
    configStub.mode.test = true;

    // Stub stripe API
    stripeStub = {
      checkout: {
        sessions: {
          //create: sinon.stub(),
          create: sinon.stub().resolves({ url: "https://example.com/checkout", id: "test_session_id" }),
          retrieve: sinon.stub().rejects(new Error("Stripe API error")),
          //retrieve: sinon.stub().resolves({}),
          listLineItems: sinon.stub(),
        },
      },
      customers: { // ensure customers is defined
        create: sinon.stub().resolves({}), // stub create method
        retrieve: sinon.stub().resolves({}), // stub retrieve method
      }
    };

    // initialize Stripe with a test API key
    const stripeModuleStub = sinon.stub().returns(stripeStub);

    // Stub audit function
    auditStub = sinon.stub();

    // Stub next function
    nextStub = sinon.stub();

    // Stub req and res objects
    reqStubCreateCheckoutSession = {
      parameters: {
        session_id: "test_session_id"
      },
      customers: sinon.stub(),
      t: sinon.stub().returns("Payment checkout customer creation error: {{err}}")
    };

    reqStubSuccess = {
      parameters: {
        session_id: "test_session_id"
      },
      t: sinon.stub().returns("Error retrieving payment info on payment success callback: {{err}}")
    };
    reqStubCancel = {
      parameters: {
        session_id: "test_session_id"
      },
      t: sinon.stub().returns("Error retrieving payment info on payment cancel callback: {{err}}")
    };

    reqStub = reqStubSuccess;

    resStub = {
      status: sinon.stub().returnsThis(), // ensure status is chainable
      json: sinon.stub(),
      send: sinon.stub(),
      redirect: sinon.stub()
    };

    // Load the module with stubs
    paymentController = proxyquire("../../src/controllers/payment.controller", {
      "stripe": stripeModuleStub, // use the initialized Stripe instance
      "../config": configStub,
      "../libs/messaging": { audit: auditStub },
      "../libs/misc": {
        formatMoney: sinon.stub().returns("$100.00"),
        nextError: sinon.stub().callsFake((next, message, status) => {
          const error = new Error(message);
          error.status = status;
          next(error);
        })
      },
    });

    User.findById = sinon.stub().resolves(null); // Simulate user not found
  });

  // ... rest of your tests



  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should handle error during payment success", async () => {
    const paymentSuccess = paymentController.paymentSuccess;

    await paymentSuccess(reqStubSuccess, resStub, nextStub);

    expect(nextStub.calledOnce).to.be.true;
    expect(nextStub.firstCall.args[0].status).to.equal(500);
    expect(nextStub.firstCall.args[0].message).to.equal("Error retrieving payment info on payment success callback: {{err}}");
    expect(auditStub.calledOnce).to.be.true;
  });
  */

  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should handle error during payment cancellation", async () => {
    const { paymentCancel } = paymentController;

    await paymentCancel(reqStubCancel, resStub, nextStub);

    expect(nextStub.calledOnce).to.be.true;
    expect(nextStub.firstCall.args[0].status).to.equal(500);
    expect(nextStub.firstCall.args[0].message).to.equal("Error retrieving payment info on payment cancel callback: {{err}}");
    expect(auditStub.calledOnce).to.be.true;
  });
  */

  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should handle user not found", async () => {
    const { createCheckoutSession } = paymentController;

    reqStub.userId = "non-existent-user-id";
    reqStub.parameters = {};
    reqStub.parameters.cart = {};
    reqStub.parameters.cart.items = [];
    reqStub.parameters.cart.items[0] = { name: "item1" };
    User.findById = sinon.stub().resolves(null);
  
    await createCheckoutSession(reqStub, resStub, nextStub);
  
    expect(resStub.status.calledOnce).to.be.true;
    expect(resStub.status.firstCall.args[0]).to.equal(403);
    expect(resStub.json.calledOnce).to.be.true;
    expect(resStub.json.firstCall.args[0].message).to.equal(reqStub.t("User with id {{userId}} not found", { userId: reqStub.userId }));
  });
  */

  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should handle customer creation error", async () => {
    const { createCheckoutSession } = paymentController;
  
    reqStubCreateCheckoutSession.userId = "existing-user-id";
    reqStubCreateCheckoutSession.parameters = {};
    reqStubCreateCheckoutSession.parameters.cart = {};
    reqStubCreateCheckoutSession.parameters.cart.items = [];
    reqStubCreateCheckoutSession.parameters.cart.items[0] = { name: "item1" };
    const userDoc = new User({ email: "user@example.com", firstName: "John", lastName: "Doe" });
    User.findById = sinon.stub().resolves(userDoc);
  
    stripeStub.customers.create = sinon.stub().rejects(new Error("Customer creation failed"));
  
    await createCheckoutSession(reqStubCreateCheckoutSession, resStub, nextStub);
  
    expect(resStub.status.calledOnce).to.be.true;
    expect(resStub.status.firstCall.args[0]).to.equal(400);
    expect(resStub.json.calledOnce).to.be.true;
    expect(resStub.json.firstCall.args[0].message).to.equal("Customer creation failed");
  });
  */

  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should throw error if session response is incomplete", async () => {
    const { createCheckoutSession } = paymentController;
  
    reqStubCreateCheckoutSession.userId = "existing-user-id";
    reqStubCreateCheckoutSession.parameters = {};
    reqStubCreateCheckoutSession.parameters.cart = {};
    reqStubCreateCheckoutSession.parameters.cart.items = [];
    reqStubCreateCheckoutSession.parameters.cart.items[0] = { name: "item1" };
    const userDoc = new User({ email: "user@example.com", firstName: "John", lastName: "Doe" });
    User.findById = sinon.stub().resolves(userDoc);
  
    stripeStub.checkout.sessions.create = sinon.stub().resolves({});
  
    await createCheckoutSession(reqStubCreateCheckoutSession, resStub, nextStub);
  
    expect(nextStub.calledOnce).to.be.true;
    expect(nextStub.firstCall.args[0].status).to.equal(500);
    expect(nextStub.firstCall.args[0].message).to.equal(reqStubCreateCheckoutSession.t("Payment checkout session creation error: {{err}}", { err: "no session url" }));
  });
  */
  
  /* // TODO: on GitHub CI these tests fail becaus config.undefined.js is not found ...
  it("should update user preferences if accepting offers emails", async () => {
    const { createCheckoutSession } = paymentController;
    reqStub.userId = "existing-user-id";
    reqStub.parameters = {};
    reqStub.parameters.cart = {};
    reqStub.parameters.cart.items = [];
    reqStub.parameters.cart.items[0] = { name: "item1" };
    //reqStub.cart = { acceptToReceiveOffersEmails: true };
    reqStub.parameters.cart.acceptToReceiveOffersEmails = true;
  
    // Define the preferences object within userDoc
    const userDoc = new User({
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      preferences: {
        notifications: {
          email: {
            offers: false // initially set to false
          }
        }
      },
      save: sinon.stub() // Stub save method
    });
  
    // stub the save method on userDoc
    userDoc.save = sinon.stub();
    
    User.findById = sinon.stub().resolves(userDoc);
  
    const stripeModuleStub = sinon.stub().returns(stripeStub);
    paymentController = proxyquire("../../src/controllers/payment.controller", {
      "stripe": stripeModuleStub,
      "../config": configStub,
      "../libs/messaging": { audit: auditStub }
    });
    reqStub.parameters = {};
    reqStub.parameters.cart = {};
    reqStub.parameters.cart.items = [];
    reqStub.parameters.cart.items[0] = { name: "item1" };
    //reqStub.cart = { acceptToReceiveOffersEmails: true };
    reqStub.parameters.cart.acceptToReceiveOffersEmails = true;

    await createCheckoutSession(reqStub, resStub, nextStub);
  
    //console.log("userDoc:", userDoc.preferences.notifications.email);
    expect(userDoc.save.calledOnce).to.be.true;
    expect(userDoc.preferences.notifications.email.offers).to.be.false;
  });  
  */
  
});

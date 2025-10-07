const chai = require("chai");
const sinon = require("sinon");
const { expect } = chai;
const Stripe = require("stripe");
const StripeGateway = require("../../src/gateways/stripe.payment.gateway");
const User = require("../../src/models/user.model");
const config = require("../../src/config");

describe("Stripe payment gateway", function () {
  let stubFindById;
  let stripeGateway;
  let stripeClientStub;
  let stripeConstructorStub;
  let mockUser;

  beforeEach(() => {
    // completely mock the Stripe library
    stripeClientStub = {
      customers: {
        create: sinon.stub().resolves({
          id: "cus_mockCustomerId",
          email: "test@example.com",
          name: "Test User"
        }),
        retrieve: sinon.stub().resolves({
          id: "cus_mockCustomerId",
        }),
      },
      checkout: {
        sessions: {
          create: sinon.stub().resolves({
            url: "https://checkout.stripe.com/mock-session",
            id: "cs_mock_session"
          }),
          retrieve: sinon.stub().resolves({
            customer: { email: "test@example.com" },
            shipping_details: {},
            metadata: {},
            id: "cs_mock_session"
          }),
          listLineItems: sinon.stub().resolves({ data: [] })
        }
      }
    };

    // completely replace Stripe constructor to return our stub
    stripeConstructorStub = sinon.stub(Stripe.prototype, "constructor").returns(stripeClientStub);

    // stub User.findById
    stubFindById = sinon.stub(User, "findById");
    mockUser = {
      email: "valid@example.com",
      firstName: "Test",
      lastName: "User",
      stripeCustomerId: null,
      save: sinon.stub().resolves(),
      preferences: {
        notifications: {
          email: {
            offers: false
          }
        }
      }
    };
    stubFindById.resolves(mockUser);

    // create the gateway instance with a mock config
    stripeGateway = new StripeGateway(config);
    
    // manually set up the client with our stub
    stripeGateway.client = stripeClientStub;

    // mock environment variables
    process.env.STRIPE_API_KEY_TEST = "sk_test_mockkey";
  });
  
  afterEach(() => {
    // restore the stripe constructor stub
    stripeConstructorStub.restore();
    
    // clean up all stubs after each test
    sinon.restore();
  });

  describe("init", function () {
    it("should initialize Stripe client with API key", function () {
      // temporarily reset environment variables
      const originalApiKey = process.env.STRIPE_API_KEY_TEST;
      process.env.STRIPE_API_KEY_TEST = "sk_test_mockkey";
  
      try {
        // create a new StripeGateway instance
        const testGateway = new StripeGateway(config);
  
        // call init method
        testGateway.init();
  
        // verify the client exists
        expect(testGateway.client).to.exist;
  
        // verify the client has the required methods
        expect(testGateway.client.customers).to.exist;
        expect(testGateway.client.checkout).to.exist;
        expect(testGateway.client.checkout.sessions).to.exist;
      } finally {
        // restore original environment variable
        process.env.STRIPE_API_KEY_TEST = originalApiKey;
      }
    });
  
    // it("should throw an error if Stripe client throws", function () {
    //   const originalStripe = Stripe; // Save the original 
    //   try {
    //     // Temporarily replace Stripe constructor
    //     global.Stripe = () => {
    //       throw new Error("Simulated Stripe initialization error");
    //     };

    //     // Your test code here
    //     //this.init(); // This should now trigger the catch block
    //     const testGateway = new StripeGateway(config);
    //     testGateway.init();

    //   } finally {
    //     // Restore the original Stripe constructor
    //     global.Stripe = originalStripe;
    //   }
    // });

    it("should throw an error if API key is not configured", function () {
      // temporarily unset environment variables
      const originalApiKey = process.env.STRIPE_API_KEY_TEST;
      delete process.env.STRIPE_API_KEY_TEST;
  
      try {
        const testGateway = new StripeGateway(config);
        expect(() => testGateway.init()).to.throw(/Stripe API key not configured for current environment/);
      } finally {
        // restore original environment variable
        process.env.STRIPE_API_KEY_TEST = originalApiKey;
      }
    });

    


  });

  describe("createCheckoutSession", function () {
    it("should return error if client is not valid", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();

      stripeClientStub = null;
      
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;
      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Internal error (init not called)" })).to.be.true;
    });

    it("should return error if user not found", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();
      
      mockUser = null;
      stubFindById.resolves(mockUser);
      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ message: "User with id {{userId}} not found" })).to.be.true;
    });

    it("should return error if cart is empty", async () => {
      const req = { 
        parameters: { cart: { items: [] } }, 
        t: (msg) => msg,
        userId: null
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();

      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Empty cart" })).to.be.true;
    });

    it("should return error if cart is empty", async () => {
      const req = { 
        parameters: { cart: { items: [] } }, 
        t: (msg) => msg,
        userId: null
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();

      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Empty cart" })).to.be.true;
    });

    /*
    it("should return error if this.client.customers.create rejects", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();
      
      // recreate the full stub with the modified checkout session create method
      stripeClientStub = {
        customers: {
          create: sinon.stub().rejects(new Error("Error creating customer")),
          retrieve: sinon.stub().resolves({
            id: "cus_mockCustomerId",
          }),
        },
        checkout: {
          sessions: {
            create: sinon.stub().resolves(null),
            retrieve: sinon.stub().resolves({
              customer: { email: "test@example.com" },
              shipping_details: {},
              metadata: {},
              id: "cs_mock_session"
            }),
            listLineItems: sinon.stub().resolves({ data: [] })
          }
        }
      };
    
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;
      
      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Error creating customer" })).to.be.true;
    });

    it("should return error if returned session is not valid", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();
      
      // recreate the full stub with the modified checkout session create method
      stripeClientStub = {
        customers: {
          create: sinon.stub().resolves({
            id: "cus_mockCustomerId",
            email: "test@example.com",
            name: "Test User"
          }),
          retrieve: sinon.stub().resolves({
            id: "cus_mockCustomerId",
          }),
        },
        checkout: {
          sessions: {
            create: sinon.stub().resolves(null),
            retrieve: sinon.stub().resolves({
              customer: { email: "test@example.com" },
              shipping_details: {},
              metadata: {},
              id: "cs_mock_session"
            }),
            listLineItems: sinon.stub().resolves({ data: [] })
          }
        }
      };
    
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;
      
      await stripeGateway.createCheckoutSession(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.exist;
      expect(error).to.be.an("error");
      expect(error.message).to.include("Payment checkout session creation err");
      expect(error.status).to.equal(500);
    });

    it("should return error if returned session url is not valid", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();
      
      // recreate the full stub with the modified checkout session create method
      stripeClientStub = {
        customers: {
          create: sinon.stub().resolves({
            id: "cus_mockCustomerId",
            email: "test@example.com",
            name: "Test User"
          }),
          retrieve: sinon.stub().resolves({
            id: "cus_mockCustomerId",
          }),
        },
        checkout: {
          sessions: {
            create: sinon.stub().resolves({
              url: null
            }),
            retrieve: sinon.stub().resolves({
              customer: { email: "test@example.com" },
              shipping_details: {},
              metadata: {},
              id: "cs_mock_session"
            }),
            listLineItems: sinon.stub().resolves({ data: [] })
          }
        }
      };
    
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;
      
      await stripeGateway.createCheckoutSession(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.exist;
      expect(error).to.be.an("error");
      expect(error.message).to.include("Payment checkout session creation err");
      expect(error.status).to.equal(500);
    });

    it("should create checkout session for authenticated user", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            deliveryCode: "DEL123",
            isGift: false
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();

      await stripeGateway.createCheckoutSession(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // verify that customer creation was attempted if user exists
      expect(stripeClientStub.customers.create.calledOnce).to.be.true;
    });

    it("should handle cart.acceptToReceiveOffersEmails", async () => {
      const req = {
        userId: 123,
        parameters: {
          cart: {
            items: [
              {
                mdaCode: "abc",
                price: 12300, // in cents
                quantity: 1,
                imageName: "test.jpg"
              }
            ],
            acceptToReceiveOffersEmails: true,
          }
        }, 
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(), 
        json: sinon.stub() 
      };
      const next = sinon.stub();

      //console.log("Test mockUser before:", mockUser);
      await stripeGateway.createCheckoutSession(req, res, next);
      //console.log("Test mockUser after:", mockUser);

      expect(mockUser.save.callCount).to.equal(2); // should be called twice: to save customerId and preferences
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // verify that customer creation was attempted if user exists
      expect(stripeClientStub.customers.create.calledOnce).to.be.true;
    });
  });

  describe("paymentSuccess", function () {
    it("should error out if this.client is not set", async () => {
      // create a new gateway instance without initializing the client
      const uninitializedGateway = new StripeGateway(config);

      const req = { 
        parameters: { session_id: "sess_123" },
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      uninitializedGateway.client = null;

      await uninitializedGateway.paymentSuccess(req, res, next);

      // verify the error response
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Please call init" })).to.be.true;
    });

    it("should error out on this.client.checkout.sessions.retrieve error", async () => {
      const req = { 
        parameters: { session_id: "sess_123" },
        t: (msg) => msg
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      stripeClientStub.checkout.sessions.retrieve = sinon.stub().rejects(new Error("Stripe API error"));
      stripeGateway = new StripeGateway(config);
      stripeGateway.client = stripeClientStub;

      await stripeGateway.paymentSuccess(req, res, next);

      // verify that next was called with an error
      expect(next.calledOnce).to.be.true;
      
      // check the error passed to next
      const error = next.firstCall.args[0];
      expect(error).to.be.an("error");
      expect(error.message).to.include("Error retrieving payment info on payment success callback");
      expect(error.status).to.equal(500);
      
      // in non-production mode, stack should be present
      expect(error.stack).to.be.a("string");
    });

    it("should retrieve session and redirect on success with address.line2 set", async () => {
      const req = { 
        query: { session_id: "sess_123" }, 
        t: (msg) => msg,
        parameters: { session_id: "sess_123" }
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      // recreate the full stub with the modified checkout session create method
      stripeClientStub = {
        customers: {
          create: sinon.stub().rejects(new Error("Error creating customer")),
          retrieve: sinon.stub().resolves({
            id: "cus_mockCustomerId",
          }),
        },
        checkout: {
          sessions: {
            create: sinon.stub().resolves(null),
            retrieve: sinon.stub().resolves({
              customer: { email: "test@example.com" },
              shipping_details: {
                address: {
                  line2: "abc",
                }
              },
              metadata: {},
              id: "cs_mock_session"
            }),
            listLineItems: sinon.stub().resolves({ data: [] })
          }
        }
      };
    
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;

      await stripeGateway.paymentSuccess(req, res, next);

      expect(res.redirect.calledOnce).to.be.true;
      expect(stripeClientStub.checkout.sessions.retrieve.calledWith("sess_123")).to.be.true;
    });

    it("should retrieve session and redirect on success with session.metadata.isGift set", async () => {
      const req = { 
        query: { session_id: "sess_123" }, 
        t: (msg) => msg,
        parameters: { session_id: "sess_123" }
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      // recreate the full stub with the modified checkout session create method
      stripeClientStub = {
        customers: {
          create: sinon.stub().rejects(new Error("Error creating customer")),
          retrieve: sinon.stub().resolves({
            id: "cus_mockCustomerId",
          }),
        },
        checkout: {
          sessions: {
            create: sinon.stub().resolves(null),
            retrieve: sinon.stub().resolves({
              customer: { email: "test@example.com" },
              shipping_details: {},
              metadata: {
                isGift: true,
              },
              id: "cs_mock_session"
            }),
            listLineItems: sinon.stub().resolves({ data: [] })
          }
        }
      };
    
      // replace the Stripe constructor
      //stripeConstructorStub.returns(stripeClientStub);

      // manually set the client on the gateway
      stripeGateway.client = stripeClientStub;

      await stripeGateway.paymentSuccess(req, res, next);

      expect(res.redirect.calledOnce).to.be.true;
      expect(stripeClientStub.checkout.sessions.retrieve.calledWith("sess_123")).to.be.true;
    });

    it("should retrieve session and redirect on success", async () => {
      const req = { 
        query: { session_id: "sess_123" }, 
        t: (msg) => msg,
        parameters: { session_id: "sess_123" }
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      await stripeGateway.paymentSuccess(req, res, next);

      expect(res.redirect.calledOnce).to.be.true;
      expect(stripeClientStub.checkout.sessions.retrieve.calledWith("sess_123")).to.be.true;
    });
  });

  describe("paymentCancel", function () {
    it("should error out if this.client is not set", async () => {
      // create a new gateway instance without initializing the client
      const uninitializedGateway = new StripeGateway(config);

      const req = { 
        parameters: { session_id: "sess_123" },
        t: (msg) => msg
      };
      const res = { 
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      uninitializedGateway.client = null;

      await uninitializedGateway.paymentCancel(req, res, next);

      // verify the error response
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: "Please call init" })).to.be.true;
    });

    it("should error out on this.client.checkout.sessions.retrieve error", async () => {
      const req = { 
        parameters: { session_id: "sess_123" },
        t: (msg) => msg
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      stripeClientStub.checkout.sessions.retrieve = sinon.stub().rejects(new Error("Stripe API error"));
      stripeGateway = new StripeGateway(config);
      stripeGateway.client = stripeClientStub;

      await stripeGateway.paymentCancel(req, res, next);

      // verify that next was called with an error
      expect(next.calledOnce).to.be.true;
      
      // check the error passed to next
      const error = next.firstCall.args[0];
      expect(error).to.be.an("error");
      expect(error.message).to.include("Error retrieving payment info on payment cancel callback");
      expect(error.status).to.equal(500);
      
      // in non-production mode, stack should be present
      expect(error.stack).to.be.a("string");
    });

    it("should retrieve session and redirect on cancelation", async () => {
      const req = { 
        parameters: { session_id: "sess_123" },
        t: (msg) => msg
      };
      const res = { 
        redirect: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      const next = sinon.stub();

      await stripeGateway.paymentCancel(req, res, next);

      expect(res.redirect.calledOnce).to.be.true;
      expect(stripeClientStub.checkout.sessions.retrieve.calledWith("sess_123")).to.be.true;
    });
  */
  });
});

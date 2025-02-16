/**
 * Payment routes tests
 */

const server = require("../server.test");
const { getAuthCookiesAdmin } = require("../setup/setup.test");
// const db = require("../../src/models");
const User = require("../../src/models/user.model");
// const Role = require("../../src/models/role.model");
const config = require("../config.test");

describe("Payment routes", () => {

  let stripeSessionId;

  // it("should get payment mode, and it should be in a set of values", async () => {
  //   const res = await server.request
  //     .get("/api/payment/mode")
  //     .set("Cookie", getAuthCookiesAdmin())
  //     .send({})
  //   ;
  //   expect = 200;
  //   if (res.status !== expect) {
  //     console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
  //     throw new Error();
  //   }
  //   server.expect(res.body).to.have.property("mode");
  //   server.expect(res.body.mode).to.be.oneOf(["test", "live"]);
  // });

  it("should not create a checkout session without a cart", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .send({})
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Empty cart");
  });

  it("should not create a checkout session with an empty cart", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .send({ cart: [] })
    ;
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.equal("Empty cart");
  });

  it("should not create a checkout session with a cart with an empty item", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({
        cart: {
          items: [{ }],
        }
      })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" Missing required param:"));
  });

  // cart items parameters:
  // item.mdaCode,
  // item.imageUrl,
  // item.notes, (optional)
  // item.price, (integer (cents))
  // item.quantity,
  it("should not create a checkout session with a cart with an item without mdaCode", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({
        cart: {
          items: [{ /*mdaCode: 123,*/ imageUrl: "https://example.com/image.jpg", price: 1, quantity: 1 }],
        }
      })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" Missing required param:"));
  });

  it("should not create a checkout session with a cart with an item no mdaCode", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({
        cart: {
          items: [{ /*mdaCode: 123,*/ price: 100, quantity: 1 }],
        }
      })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" Missing required param:"));
  });

  it("should not create a checkout session with a cart with no price", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({ cart: { items: [{ mdaCode: 123, /*price: 100,*/ quantity: 1 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" Prices require an `unit_amount` or `unit_amount_decimal` parameter to be set"));
  });

  it("should not create a checkout session with a cart with no quantity", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({ cart: { items: [{ mdaCode: 123, price: 100/*, quantity: 1*/ }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" Quantity is required"));
  });

  it("should not create a checkout session with a cart with zero quantity", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({ cart: { items: [{ mdaCode: 123, price: 100, quantity: 0 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" This value must be greater than or equal to 1"));
  });

  it("should not create a checkout session with a cart with a too low price", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", getAuthCookiesAdmin())
      .send({ cart: { items: [{ mdaCode: 123, price: 49, quantity: 1 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith(" The Checkout Session&#39;s total amount due must add up to at least"));
  });

/*
  it("should not create a checkout session for a non-existent product", async () => {
    const res = await server.request
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
*/
  
  it("should create a checkout session for a regular product for a guest user", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      //.set("authorization", accessTokenUser)
      .send({ cart: { items: [{ mdaCode: 123, price: 100, quantity: 1 }] } })
    ;
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("session");
    stripeSessionId = res.body.session.id;
  });
  
  it("should redirect on a payment success call", async () => {
    const res = await server.request
      .get("/api/payment/paymentSuccess")
      .query({session_id: stripeSessionId})
      .redirects(0)
    ;
    expect = 302;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

  it("should redirect on a payment canceled call", async () => {
    const res = await server.request
      .get("/api/payment/paymentCancel")
      .query({session_id: stripeSessionId})
      .redirects(0)
    ;
    expect = 302;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
  });

});
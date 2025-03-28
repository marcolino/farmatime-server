/**
 * Payment routes tests
 */

const server = require("../server.test");

describe("Payment routes", () => {

  let stripeSessionId;

  before(async () => {
    await server.resetDatabase();
  });

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
      .set("Cookie", server.getAuthCookies("admin"))
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
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("Missing required param:"));
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
      .set("Cookie", server.getAuthCookies("admin"))
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
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("Missing required param:"));
  });

  it("should not create a checkout session with a cart with an item no mdaCode", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", server.getAuthCookies("admin"))
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
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("Missing required param:"));
  });

  it("should not create a checkout session with a cart with no price", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ cart: { items: [{ mdaCode: 123, /*price: 100,*/ quantity: 1 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("Prices require an `unit_amount` or `unit_amount_decimal` parameter to be set"));
  });

  it("should not create a checkout session with a cart with no quantity", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ cart: { items: [{ mdaCode: 123, price: 100, /*quantity: 0*/ }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("Quantity is required."));
  });

  it("should not create a checkout session with a cart with zero quantity", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ cart: { items: [{ mdaCode: 123, price: 100, quantity: 0 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("This value must be greater than or equal to 1"));
  });

  it("should not create a checkout session with a cart with a too low price", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({ cart: { items: [{ mdaCode: 123, price: 49, quantity: 1 }] } })
    ;
    expect = 500;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.be.a("string").and.satisfy(msg => msg.startsWith("The Checkout Session&#39;s total amount due must add up to at least"));
  });
  
  it("should create a checkout session for a regular product for a guest user", async () => {
    const res = await server.request
      .post("/api/payment/createCheckoutSession")
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
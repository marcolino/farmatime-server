/**
 * Product routes tests
 */

const server = require("../server.test");
const configTest = require("../setup.test");
const config = require("../../src/config");

let expect;
let testProductId;


describe("Product routes", () => {
  before(async () => {
    await server.resetDatabase();
    
    // create a test product for reuse in tests
    const res = await server.request
      .post("/api/product/insertProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        product: configTest.testProduct
      });
    
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    testProductId = res.body.id;
  });

  it("should get all products capped as guest user", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("products");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.equal(config.products.restrictForNonDealers);
  });

  it("should get all products capped as user", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .set("Cookie", server.getAuthCookies("user"))
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("products");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.equal(config.products.restrictForNonDealers);
  });

  it("should get all products un-capped as dealer", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .set("Cookie", server.getAuthCookies("dealer"))
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("products");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.be.above(config.products.restrictForNonDealers);
  });

  it("should get all products un-capped as operator", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .set("Cookie", server.getAuthCookies("operator"))
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("products");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.be.above(config.products.restrictForNonDealers);
  });

  it("should get all products un-capped as admin", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("products");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.be.above(config.products.restrictForNonDealers);
  });

  it("should get products with filter", async () => {
    const res = await server.request
      .get("/api/product/getProducts")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        filter: {
          make: "Test Make"
        }
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body.products).to.be.an("array");
    server.expect(res.body.products.length).to.be.at.least(1);
    server.expect(res.body.products[0].make).to.equal("Test Make");
  });

  it("should get a single product by id", async () => {
    const res = await server.request
      .get(`/api/product/getProduct`)
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        productId: testProductId
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("product");
    server.expect(res.body.product.id).to.equal(testProductId);
    server.expect(res.body.product.mdaCode).to.equal(configTest.testProduct.mdaCode);
  });

  it("should fail to get a product with a wrong id", async () => {
    const res = await server.request
      .get(`/api/product/getProduct`)
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        productId: "wrong id", // wrong id
      });
      
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
  });

  it("should fail to get a product with non-existent id", async () => {
    const res = await server.request
      .get(`/api/product/getProduct`)
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        productId: "60f1a7b87c213e001c123456" // non-existent ID
      });
      
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
  });

  it("should get all product types", async () => {
    const res = await server.request
      .get("/api/product/getProductAllTypes")
      .set("Cookie", server.getAuthCookies("user"))
      .send({});
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("types");
    server.expect(res.body.types).to.be.an("array");
    server.expect(res.body.types).to.include("motorino");
    server.expect(res.body.types).to.include("alternatore");
  });

  it("should insert a new product", async () => {
    const newProduct = {
      mdaCode: "NEW123",
      oemCode: "NEWOEM456",
      make: "New Make",
      models: ["New Model A", "New Model B"],
      application: "New Application",
      kw: "2.0",
      volt: "24",
      teeth: "10",
      rotation: "sinistra",
      ampere: "120",
      regulator: "incorporato",
      notes: "New test notes",
      type: "alternatore"
    };
    
    const res = await server.request
      .post("/api/product/insertProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        product: newProduct
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("id");
    server.expect(res.body).to.have.property("message");
    
    // verify the product was actually created
    const verifyRes = await server.request
      .get(`/api/product/getProduct`)
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        productId: res.body.id
      });
    
    server.expect(verifyRes.status).to.equal(200);
    server.expect(verifyRes.body.product.mdaCode).to.equal(newProduct.mdaCode);
  });

  it("should update an existing product", async () => {
    const updatedProduct = {
      mdaCode: configTest.testProduct.mdaCode,
      make: "Updated Make",
      notes: "Updated notes"
    };
    
    const res = await server.request
      .post("/api/product/updateProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        productId: testProductId,
        product: updatedProduct
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("product");
    server.expect(res.body.product.make).to.equal("Updated Make");
    server.expect(res.body.product.notes).to.equal("Updated notes");
    server.expect(res.body.product.mdaCode).to.equal(configTest.testProduct.mdaCode);
  });

  it("should fail to update a non-existent product", async () => {
    const res = await server.request
      .post("/api/product/updateProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        productId: "60f1a7b87c213e001c123456", // Non-existent ID
        product: {
          make: "Updated Make"
        }
      });
      
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body.message).to.include("Product not found");
  });

  // test uploading product image (mock, since we can't actually upload a file in this test)
  it("should handle missing file when uploading product image", async () => {
    const res = await server.request
      .post("/api/product/uploadProductImage")
      .set("Cookie", server.getAuthCookies("admin"))
      .field("productId", testProductId)
    ;  
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("error");
  });

  it("should delete products by ID array", async () => {
    // first create a product to delete
    const response = await server.request
      .post("/api/product/insertProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        product: {
          mdaCode: "DELETE123",
          type: "motorino"
        }
      });
    
    const productToDeleteId = response.body.id;
    
    const res = await server.request
      .post("/api/product/deleteProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        filter: [productToDeleteId]
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.count).to.equal(1);
    
    // verify the product was actually deleted
    const verifyRes = await server.request
      .get(`/api/product/getProduct`)
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        productId: productToDeleteId
      });
    
    server.expect(verifyRes.status).to.equal(400);
  });

  it("should mark products as removed (logical delete)", async () => {
    // first create a product to remove
    const response = await server.request
      .post("/api/product/insertProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        product: {
          mdaCode: "REMOVE123",
          type: "motorino"
        }
      });
    
    const productToRemoveId = response.body.id;
    
    const res = await server.request
      .post("/api/product/removeProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        filter: [productToRemoveId]
      });
      
    expect = 200;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
    server.expect(res.body).to.have.property("count");
    server.expect(res.body.count).to.equal(1);
    
    // this test can be done assuming we want to let getProduct some way return deleted products too
    // product should still exist but be marked as deleted
    const verifyRes = await server.request
      .get("/api/product/getProduct")
      .set("Cookie", server.getAuthCookies("user"))
      .send({
        deletedToo: true,
        productId: productToRemoveId
      });
    
    server.expect(verifyRes.status).to.equal(200);
  });

  it("should fail with invalid filter when deleting products", async () => {
    const res = await server.request
      .post("/api/product/deleteProduct")
      .set("Cookie", server.getAuthCookies("admin"))
      .send({
        filter: "invalid-filter" // neither * nor object nor array
      });
      
    expect = 400;
    if (res.status !== expect) {
      console.error(`Expected: ${expect}, actual: ${res.status}`, res.body.stack ?? res.body.message ?? "");
      throw new Error();
    }
    server.expect(res.body).to.have.property("message");
  });

  // TODO: add more tests as needed for additional endpoints or edge cases
});

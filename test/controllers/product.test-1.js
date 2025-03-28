const chai = require("chai");
const sinon = require("sinon");
const { expect } = chai;

const productController = require("../../src/controllers/product.controller");
const Product = require("../../src/models/product.model");
const User = require("../../src/models/user.model");
const Role = require("../../src/models/role.model");
const { logger } = require("../../src/controllers/logger.controller");
const { saveImageFile } = require("../../src/helpers/images");
const { isDealerAtLeast } = require("../../src/helpers/misc");
const mongoose = require("mongoose");
const config = require("../../src/config");

describe("Product Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      parameters: {},
      t: (key) => key, // Mock translation function
      userId: "testUserId",
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
      sendFile: sinon.spy(),
    };
    next = sinon.spy();

    sinon.replace(require("../../src/helpers/misc"), "isDealerAtLeast", sinon.stub().returns(Promise.resolve(true)));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getProducts", () => {
    it("should return 400 if filter is not an object", async () => {
      req.parameters.filter = "invalid";
      await productController.getProducts(req, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
    });
  });

    it("should return products and count", async () => {
      //console.log("isDealerAtLeast:", isDealerAtLeast);
      //sinon.stub(isDealerAtLeast).returns(true);

      req.parameters.filter = { make: "testMake" };
      const products = [{ _id: "1", make: "testMake" }];
      sinon.stub(Product, "countDocuments").resolves(1);
      sinon.stub(Product, "find").returns({
        collation: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        select: sinon.stub().returnsThis(),
        lean: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(products),
      });
      sinon.stub(Product.schema.path("make").options, "searchable").value(true);
    
      await productController.getProducts(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ products, count: 1 })).to.be.true;
    });
    

    it("should handle errors", async () => {
      sinon.stub(Product, "countDocuments").rejects(new Error("Test error"));
      sinon.spy(logger, "error");
      await productController.getProducts(req, res);
      expect(res.status.calledWith(500)).to.be.true;
      expect(logger.error.calledOnce).to.be.true;
    });

    it("should respect limit for non dealers", async () => {
      sinon.stub(Product, "countDocuments").resolves(1);
      sinon.stub(Product, "find").resolves({
        collation: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        select: sinon.stub().returnsThis(),
        lean: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves([{}]),
      });
      sinon.stub(Product.schema.path("make").options, "searchable").value(true);
      sinon.stub(isDealerAtLeast).resolves(false);
      await productController.getProducts(req, res);
      expect(Product.find().limit.calledWith(config.products.restrictForNonDealers)).to.be.true;
    });

  });

  describe("getProduct", () => {
    it("should return 400 if productId is invalid", async () => {
      req.parameters.productId = "invalidId";
      await productController.getProduct(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].status).to.equal(400);
    });

    it("should return 400 if product not found", async () => {
      req.parameters.productId = "validId";
      sinon.stub(mongoose, "isValidObjectId").returns(true);
      sinon.stub(Product, "findOne").resolves(null);
      await productController.getProduct(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].status).to.equal(400);
    });

    it("should return product data", async () => {
      req.parameters.productId = "validId";
      sinon.stub(mongoose, "isValidObjectId").returns(true);
      const product = { _id: "validId", mdaCode: "test" };
      sinon.stub(Product, "findOne").resolves(product);
      await productController.getProduct(req, res, next);
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ product: { id: "validId", mdaCode: "test" } })).to.be.true;
    });

    it("should handle errors", async () => {
      req.parameters.productId = "validId";
      sinon.stub(mongoose, "isValidObjectId").returns(true);
      sinon.stub(Product, "findOne").rejects(new Error("Test error"));
      await productController.getProduct(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].status).to.equal(500);
    });
  });

  describe("getProductImageById", () => {
    it("should return 404 if image not found", async () => {
      req.parameters.imageId = "testImageId";
      sinon.stub(fs, "existsSync").returns(false);
      await productController.getProductImageById(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it("should send image file", async () => {
      req.parameters.imageId = "testImageId";
      sinon.stub(fs, "existsSync").returns(true);
      await productController.getProductImageById(req, res);
      expect(res.sendFile.calledOnce).to.be.true;
    });
  });

  describe("getProductAllTypes", () => {
    it("should return all product types", async () => {
      await productController.getProductAllTypes(req, res);
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ types: ["motorino", "alternatore"] })).to.be.true;
    });
  });

  // Add tests for deleteProduct, insertProduct, updateProduct, uploadProductImage, removeProduct similarly
});
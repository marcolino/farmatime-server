//const { expect } = require("chai");
const sinon = require("sinon");
const chai = require("chai");
const { expect } = chai;
const proxyquire = require("proxyquire");
const rewire = require("rewire");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../../src/models/product.model");
//const { nextError } = require("../../src/helpers/misc");
const misc = require("../../src/helpers/misc");
//const { removeProduct } = require("../../src/controllers/product.controller");

// import the controller functions to test
const {
  getProducts,
  getProduct,
  getProductImageById,
  getProductAllTypes,
  insertProduct,
  updateProduct,
  //uploadProductImage,
  deleteProduct,
  removeProduct
} = require("../../src/controllers/product.controller");

const productController = rewire("../../src/controllers/product.controller"); // for private functions


describe("Product Controller", () => {
  let req, res, next;
  let findStub, countDocumentsStub, saveStub, deleteStub, updateStub, findOneStub;

  beforeEach(() => {
    // reset stubs and mocks before each test
    findStub = sinon.stub(Product, "find");
    countDocumentsStub = sinon.stub(Product, "countDocuments");
    saveStub = sinon.stub(Product.prototype, "save");
    deleteStub = sinon.stub(Product, "deleteMany");
    updateStub = sinon.stub(Product, "updateMany");
    findOneStub = sinon.stub(Product, "findOne");

    // create mock request, response, and next function
    req = {
      parameters: {},
      body: {},
      t: (key, params) => {
        // simple translation mock
        return params ? key.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p]) : key;
      },
      restrictProducts: 0
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      sendFile: sinon.stub().returnsThis()
    };

    next = sinon.stub();
  });

  afterEach(() => {
    // restore all stubs
    sinon.restore();
  });

  describe("getProducts", () => {
    it("should return products with correct filter", async () => {
      req.parameters.filter = { make: "Toyota" };
      
      const mockProducts = [
        { _id: "1", make: "Toyota", models: "Corolla" },
        { _id: "2", make: "Toyota", models: "Camry" }
      ];

      // create a stub that returns a mock with method chaining
      const findChain = {
        collation: sinon.stub().returnsThis(),
        limit: sinon.stub().returnsThis(),
        select: sinon.stub().returnsThis(),
        lean: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockProducts)
      };
      findStub.returns(findChain);

      const countChain = {
        collation: sinon.stub().resolves(2)
      };
      countDocumentsStub.returns(countChain);

      await getProducts(req, res, next);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, sinon.match({
        products: mockProducts,
        count: 2
      }));
    });
  });

  describe("getProduct", () => {
    it("should return product by valid ID", async () => {
      const mockProductId = new mongoose.Types.ObjectId();
      req.parameters.productId = mockProductId;

      const mockProduct = {
        _id: mockProductId,
        mdaCode: "MDA-001",
        make: "Toyota",
        models: "Corolla"
      };

      sinon.stub(mongoose, "isValidObjectId").returns(true);
      findOneStub.resolves(mockProduct);

      await getProduct(req, res, next);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, sinon.match({
        product: sinon.match({
          id: mockProductId,
          mdaCode: mockProduct.mdaCode,
          make: mockProduct.make,
          models: mockProduct.models,
        })
      }));
    });

    it("should handle invalid product ID", async () => {
      req.parameters.productId = "invalid-id";

      sinon.stub(mongoose, "isValidObjectId").returns(false);

      await getProduct(req, res, next);

      sinon.assert.calledWith(next, sinon.match.instanceOf(Error));
    });
  });

  describe("getProductImageById", () => {
    it("should serve existing image", () => {
      req.parameters.imageId = "test-image.jpg";
      
      const mockImagePath = path.join(__dirname, "..", "..", "src", "controllers", "images", "test-image.jpg");
      
      sinon.stub(fs, "existsSync").returns(true);
  
      getProductImageById(req, res);
  
      sinon.assert.calledWith(res.sendFile, mockImagePath);
    });
  
    it("should return 404 for non-existing image", () => {
      req.parameters.imageId = "non-existing.jpg";
      
      sinon.stub(fs, "existsSync").returns(false);
  
      getProductImageById(req, res);
  
      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledWith(res.json, sinon.match({
        message: sinon.match("Image by id non-existing.jpg not found")
      }));
    });
  });

  describe("getProductAllTypes", () => {
    it("should return predefined product types", () => {
      getProductAllTypes(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, {
        types: ["motorino", "alternatore"]
      });
    });
  });

  describe("insertProduct", () => {
    it("should insert a new product successfully", async () => {
      const newProduct = { make: "Toyota", models: "Corolla" };
      req.parameters.product = newProduct;

      await insertProduct(req, res, next);

      sinon.assert.called(saveStub);
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, sinon.match({
        message: "Product has been inserted"
      }));
    });

    it("should handle missing product data", async () => {
      await insertProduct(req, res, next);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledWith(res.json, sinon.match({
        message: "Please specify a product"
      }));
    });
  });

  describe("updateProduct", () => {
    it("should update existing product", async () => {
      const productId = new mongoose.Types.ObjectId();
      req.parameters.productId = productId;
      req.parameters.product = { make: "Updated Toyota" };

      const mockProduct = {
        _id: productId,
        make: "Original Toyota",
        save: saveStub
      };

      findOneStub.resolves(mockProduct);

      await updateProduct(req, res, next);

      sinon.assert.called(saveStub);
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, sinon.match({
        product: sinon.match({ make: "Updated Toyota" })
      }));
    });

    it("should handle non-existing product", async () => {
      const productId = new mongoose.Types.ObjectId();
      req.parameters.productId = productId;
      req.parameters.product = { make: "Updated Toyota" };

      findOneStub.resolves(null);

      await updateProduct(req, res, next);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledWith(res.json, sinon.match({
        message: "Product not found"
      }));
    });
  });

  describe("deleteProduct", () => {
    it("should delete products by filter", async () => {
      req.parameters.filter = ["1", "2"];

      deleteStub.resolves({ deletedCount: 2 });

      await deleteProduct(req, res, next);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, sinon.match({
        message: "2 product(s) have been deleted",
        count: 2
      }));
    });

    it("should handle no products deleted", async () => {
      req.parameters.filter = ["1", "2"];

      deleteStub.resolves({ deletedCount: 0 });

      await deleteProduct(req, res, next);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledWith(res.json, sinon.match({
        message: "No product have been deleted"
      }));
    });
  });

  describe("removeProduct", () => {
    let req, res, next;
  
    beforeEach(() => {
      req = {
        parameters: {},
        //t: (message, params) => message.replace("{{count}}", params.count).replace("{{err}}", params.err),
        t: (message, params = {}) => message.replace("{{count}}", params.count ?? "").replace("{{err}}", params.err ?? "")
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };
      next = sinon.stub();
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    it("should handle error deleting products", async () => {
      const mockError = new Error("Database error");
      updateStub.rejects(mockError);
  
      sinon.stub(misc, "nextError").callsFake((next, message, status, stack) => {
        const error = new Error(message);
        error.status = status;
        error.stack = stack;
        return next(error);
      });
  
      req.parameters.filter = ["1", "2"];
  
      await removeProduct(req, res, next);
  
      sinon.assert.calledOnce(updateStub);
      sinon.assert.calledWith(updateStub, { _id: { $in: ["1", "2"] } }, { isDeleted: true }, { new: true, lean: true });
      sinon.assert.calledOnce(next);
      expect(next.args[0][0].message).to.equal("Error updating product to remove: Database error");
      expect(next.args[0][0].status).to.equal(500);
      expect(next.args[0][0].stack).to.equal(mockError.stack);
    });

    it("should return success when products are removed", async () => {
      // stub updateMany to return modifiedCount: 2
      updateStub.resolves({
        acknowledged: true,
        modifiedCount: 2,
      });
    
      req.parameters.filter = ["valid_id1", "valid_id2"];
      
      await removeProduct(req, res, next);
    
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, {
        message: "2 product(s) have been removed",
        count: 2
      });
    });

    it("should return success when filter is \"*\"", async () => {
      // stub updateMany to return modifiedCount: 2
      updateStub.resolves({
        acknowledged: true,
        modifiedCount: 2,
      });
    
      req.parameters.filter = "*";
      
      await removeProduct(req, res, next);
    
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledWith(res.json, {
        message: "2 product(s) have been removed",
        count: 2
      });
    });

    it("should return error if no filter is specified", async () => {
      delete req.parameters.filter;
      
      await removeProduct(req, res, next);
    
      sinon.assert.calledWith(res.status, 400);
      // sinon.assert.calledWith(res.json, {
      //   message: "No product has been removed"
      // });
      sinon.assert.calledWith(
        res.json,
        sinon.match({
          message: "Filter must be specified and be '*' or a filter object or an array of ids"
        })
      );
    });

    it("should return error if filter is not valid", async () => {
      req.parameters.filter = "wrong_filter_type";
      
      await removeProduct(req, res, next);
    
      sinon.assert.calledWith(res.status, 400);
      // sinon.assert.calledWith(res.json, {
      //   message: "No product has been removed"
      // });
      sinon.assert.calledWith(
        res.json,
        sinon.match({
          message: "Filter must be specified and be '*' or a filter object or an array of ids"
        })
      );
    });

    it("should return error when no products are removed", async () => {
      // stub updateMany to return modifiedCount: 0
      updateStub.resolves({
        acknowledged: true,
        modifiedCount: 0,
      });
    
      req.parameters.filter = ["non_existent_id"];
      
      await removeProduct(req, res, next);
    
      sinon.assert.calledWith(res.status, 400);
      // sinon.assert.calledWith(res.json, {
      //   message: "No product has been removed"
      // });
      sinon.assert.calledWith(
        res.json,
        sinon.match({
          message: "No products have been removed"
        })
      );
    });
  });

  describe("uploadProductImage", () => {
    let uploadProductImage, Product, mockImageConvert, mockImageWatermark, mockNextError, validJpegBuffer;
  
    beforeEach(() => {
      // create a valid JPEG buffer
      validJpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x00, 0x00, 0x64,
        0x00, 0x64, 0x00, 0x00, 0xFF, 0xEC, 0x00, 0x11, 0x44, 0x75, 0x63, 0x6B, 0x79, 0x00, 0x01, 0x00,
        0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xEE, 0x00, 0x0E, 0x41, 0x64, 0x6F, 0x62, 0x65,
        0x00, 0x64, 0xC0, 0x00, 0x00, 0x00, 0x01, 0xFF, 0xDB, 0x00, 0x84, 0x00, 0x1B, 0x1A, 0x1A, 0x29,
        0x1D, 0x29, 0x41, 0x26, 0x26, 0x41, 0x42, 0x2F, 0x2F, 0x2F, 0x42, 0x47, 0x3F, 0x3E, 0x3E, 0x3F,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x01, 0x1D, 0x29, 0x29,
        0x34, 0x26, 0x34, 0x3F, 0x28, 0x28, 0x3F, 0x47, 0x3F, 0x35, 0x3F, 0x47, 0x47, 0x47, 0x47, 0x47,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47,
        0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0xFF, 0xC0, 0x00,
        0x11, 0x08, 0x00, 0x08, 0x00, 0x19, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xC4, 0x00, 0x61, 0x00, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x02, 0x05, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x04, 0x10, 0x00, 0x02,
        0x02, 0x02, 0x02, 0x03, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02,
        0x11, 0x03, 0x00, 0x41, 0x21, 0x12, 0xF0, 0x13, 0x04, 0x31, 0x11, 0x00, 0x01, 0x04, 0x03, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0x31, 0x61, 0x71,
        0xB1, 0x12, 0x22, 0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
        0x00, 0xA1, 0x7E, 0x6B, 0xAD, 0x4E, 0xB6, 0x4B, 0x30, 0xEA, 0xE0, 0x19, 0x82, 0x39, 0x91, 0x3A,
        0x6E, 0x63, 0x5F, 0x99, 0x8A, 0x68, 0xB6, 0xE3, 0xEA, 0x70, 0x08, 0xA8, 0x00, 0x55, 0x98, 0xEE,
        0x48, 0x22, 0x37, 0x1C, 0x63, 0x19, 0xAF, 0xA5, 0x68, 0xB8, 0x05, 0x24, 0x9A, 0x7E, 0x99, 0xF5,
        0xB3, 0x22, 0x20, 0x55, 0xEA, 0x27, 0xCD, 0x8C, 0xEB, 0x4E, 0x31, 0x91, 0x9D, 0x41, 0xFF, 0xD9,
      ]);
  
      // mock dependencies
      mockImageConvert = sinon.stub().resolves(validJpegBuffer);
      mockImageWatermark = sinon.stub().resolves(validJpegBuffer);
      mockNextError = sinon.stub();
  
      // stub nextError
      nextErrorStub = sinon.stub().callsFake((next, message, status, stack) => {
        const error = new Error(message);
        error.status = status;
        error.stack = stack;
        return next(error);
      });

      Product = {
        findOne: sinon.stub()
      };
  
      const req = {
        file: {
          originalname: "test-image.jpg",
          buffer: validJpegBuffer,
          path: "/path/to/test-image.jpg"
        },
        body: {
          productId: new mongoose.Types.ObjectId().toString()
        },
        t: sinon.stub().returnsArg(0)
      };
  
      // proxy the images helpers to inject mock functions
      imageHelpers = proxyquire("../../src/helpers/images", {
        "../helpers/images": {
          imageConvertFormatAndLimitSize: mockImageConvert,
          imageAddWaterMark: mockImageWatermark
        },
        // "../helpers/misc": {
        //   nextError: mockNextError
        // },
        "../models/product.model": Product
      });
  
      // proxy the product controller to inject mocked dependencies
      uploadProductImage = proxyquire("../../src/controllers/product.controller", {
        //"../helpers/images": imageHelpers,
        "../models/product.model": Product,
        "../helpers/misc": {
          nextError: mockNextError
        }
      }).uploadProductImage;
    });

    afterEach(() => {
      // restore all stubs
      sinon.restore();
    });
  
    it("should successfully upload product image", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        save: sinon.stub().resolves()
      };
      Product.findOne.resolves(mockProduct);
  
      const req = {
        file: {
          originalname: "test-image.jpg",
          buffer: validJpegBuffer,
          path: "/path/to/test-image.jpg"
        },
        body: {
          productId: mockProduct._id.toString()
        },
        t: sinon.stub().returnsArg(0)
      };
  
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
  
      const next = sinon.stub();
  
      await uploadProductImage(req, res, next);
  
      sinon.assert.calledOnce(Product.findOne);
      // sinon.assert.calledOnce(mockImageConvert);
      // sinon.assert.calledOnce(mockImageWatermark);
      sinon.assert.calledWith(res.status, 200);
    });
  
    it("should handle product not found", async () => {
      Product.findOne.resolves(null);
  
      const req = {
        file: {
          originalname: "test-image.jpg",
          buffer: Buffer.from("test image data"),
          path: "/path/to/test-image.jpg"
        },
        body: {
          productId: new mongoose.Types.ObjectId().toString()
        },
        t: sinon.stub().returnsArg(0)
      };
  
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
  
      const next = sinon.stub();
  
      await uploadProductImage(req, res, next);
  
      sinon.assert.calledOnce(Product.findOne);
      sinon.assert.calledWith(res.status, 400);
    });
  
    it("should handle image conversion error", async () => {
      const mockProduct = {
        _id: new mongoose.Types.ObjectId(),
        save: sinon.stub().resolves()
      };
      Product.findOne.resolves(mockProduct);
      mockImageConvert.rejects(new Error("Conversion failed"));
  
      const req = {
        file: {
          originalname: "test-image.jpg",
          buffer: Buffer.from("test image data"),
          path: "/path/to/test-image.jpg"
        },
        body: {
          productId: mockProduct._id.toString()
        },
        t: sinon.stub().returnsArg(0)
      };
  
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
  
      const next = sinon.stub();
  
      await uploadProductImage(req, res, next);
  
      sinon.assert.calledOnce(Product.findOne);
      sinon.assert.calledOnce(mockNextError);
    });
  });
  
  describe("Private functions", () => {
    it("should validate a property", async () => {
      const propertyValidate = productController.__get__("propertyValidate");

      const result = await propertyValidate(req, "testValue");
      expect(result).to.deep.equal([null, "testValue"]);
    });

    it("should validate property mdaCode", async () => {
      const propertyMdaCodeValidate = productController.__get__("propertyMdaCodeValidate");

      const result = await propertyMdaCodeValidate(req, "testValue");
      expect(result).to.deep.equal([null, "testValue"]);
    });
  });
});

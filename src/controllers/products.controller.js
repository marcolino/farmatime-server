
//const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Product = require("../models/product.model");
const { logger } = require("./logger.controller");
const { saveImageFile } = require("../helpers/images");
const { isObject, isArray, isDealerAtLeast } = require("../helpers/misc");
const config = require("../config");


const getAllProducts = async(req, res, next) => {
  try {
    const products = await Product.find().lean().exec();
  
    // TODO: handle a filter...

    if (!products) { // TODO: handle errors...
      return res.status(404).json({ message: req.t("No product found") });
    }

    const productsData = [];
    //for (product in products) {
    products.forEach(product => {
      productsData.push({
        id: product._id,
        mdaCode: product.mdaCode,
        oemCode: product.oemCode,
        make: product.make,
        models: product.models,
        application: product.application,
        kw: product.kw,
        volt: product.volt,
        ampere: product.ampere,
        teeth: product.teeth,
        rotation: product.rotation,
        regulator: product.regulator,
        notes: product.notes,
        type: product.type,
        imageNameOriginal: product.imageNameOriginal,
        imageName: product.imageName,
        imageNameWaterMark: product.imageNameWaterMark,
      });
    });
    return res.json({ products: productsData });
  } catch (err) { // TODO...
    console.error("Error fetching products:", err);
    throw err;
  }
};

const getProducts = async(req, res, next) => {
  try {
    filter = req.parameters.filter ?? {};
    if (typeof filter !== "object") {
      return res.status(400).json({ message: req.t("A filter must be an object") });
    }

    let limit = 0; // a limit() value of 0 is equivalent to setting no limit
    if (!await isDealerAtLeast(req.userId)) { // check if request is from a dealer, at least
      limit = config.products.limitForUsers;
    }

    let products = await Product.find(filter)
      .select(["-__v"])
      //.populate("roles", "-__v")
      //.populate("plan", "-__v")
      .lean()
      .exec()
    ;
    
    let count = products.length;
    if (limit > 0) {
      products = products.slice(0, limit);
    }
    
    return res.status(200).json({products, count});
  } catch(err) {
    logger.error("Error getting all products:", err.message);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  };
};

// get product data by id
const getProduct = (req, res, next) => {
  const productId = req.parameters.productId;

  //const product = products.find(p => p.id === productId);
  Product.findOne({
    _id: productId
  })
  //.populate("roles", "-__v")
  //.populate("plan", "-__v")
  .exec(async(err, product) => {
    if (err) {
      logger.error("Error finding product:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
      //return res.status(400).json({ message: req.t("Error finding product by id {{id}}", { id: productId }) });
    }
    if (!product) {
      return res.status(400).json({ message: req.t("Could not find any product by id {{id}}", { id: productId }) });
    }
    //res.status(200).json({product});
    const productData = {
      id: product._id,
      mdaCode: product.mdaCode,
      oemCode: product.oemCode,
      make: product.make,
      models: product.models,
      application: product.application,
      kw: product.kw,
      volt: product.volt,
      teeth: product.teeth,
      rotation: product.rotation,
      ampere: product.ampere,
      regulator: product.regulator,
      notes: product.notes,
      type: product.type,
      imageNameOriginal: product.imageNameOriginal,
      imageName: product.imageName,
      imageNameWaterMark: product.imageNameWaterMark,
    };
    return res.status(200).json({ product: productData });

  });
  // if (!product) {
  //   return res.status(404).json({ message: req.t("Product by id {{id}} not found", { id: p.id }) });
  // }
};

// serve product image by id
const getProductImageById = (req, res) => {
  const imageId = req.parameters.imageId;
  const imagePath = path.join(__dirname, "images", imageId);
  
  // check if the image exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ message: req.t("Image by id {{id}} not found", { id: imageId }) });
  }
  
  return res.sendFile(imagePath);
};

// serve product all constraints  by id
const getProductAllConstraintsById = (req, res) => {
  const imageId = req.parameters.imageId;
  
  return res.status(200).json({
    types: ["motorino", "alternatore"],
  });
};

// deletes a product: delete it from database
const deleteProduct = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // TODO: attention here, we are deleting ALL products!
    filter = {};
  } else
  if (isObject(filter)) {
    ;
  } else
  if (isArray(filter)) {
    filter = { _id: { $in: filter } };
  } else
    return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });

  try {
    const data = await Product.deleteMany(filter);
    if (data.deletedCount > 0) {
      return res.status(200).json({ message: req.t("{{count}} product(s) have been deleted", { count: data.deletedCount }), count: data.deletedCount });
    } else {
      return res.status(400).json({ message: req.t("No product have been deleted") });
    }
  } catch (err) {
    logger.error(`Could not delete product(s) with filter ${JSON.stringify(filter)}: ${err.messgae}`);
    return next(Object.assign(new Error(err.message), { status: 500 }));
  }
};

/**
 * Insert new product
 */
const insertProduct = async(req, res, next) => {
  const productNew = req.parameters.product;
  if (!productNew) {
    return res.status(400).json({ message: req.t("Please specify a product") });
  }

  const product = new Product(productNew);
  product.save()
    .then(product => {
      return res.status(200).json({ id: product._id, message: req.t("product has been inserted") });
    })
    .catch(err => {
      logger.error("Error inserting product:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    })
  ;
}

/**
 * Update current product
 */
const updateProduct = async(req, res, next) => {
  const productId = req.parameters.productId;
  const productNew = req.parameters.product;

  Product.findOne({
    _id: productId
  })
  .exec(async(err, product) => {
    if (err) {
      logger.error("Error finding product:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (!product) {
      return res.status(400).json({ message: req.t("Product not found") });
    }

    // validate and normalize fields
    let [message, value] = [null, null];

    if ((productNew.mdaCode !== undefined)) {
      [message, value] = await propertyMdaCodeValidate(req, productNew.mdaCode, productNew);
      if (message) return res.status(400).json({ message });
      product.mdaCode = value;
    }
    //...
    if ((productNew.notes !== undefined)) {
      // [message, value] = await propertyNotesValidate(req, productNew.notes, productNew);
      // if (message) return res.status(400).json({ message });
      product.notes = productNew.notes;
    }

    product.save(async(err, product) => {
      if (err) {
        return res.status(err.code).json({ message: err.message });
      }
      return res.status(200).json({ product });
    });
      
  });
}

// upload product image
const uploadProductImage = (req, res, next) => {
  if (!req.file) { // no image uploaded
    res.status(400).json({ error: req.t("No image uploaded") });
  }

  const productId = req.body.productId; // TODO: why don't we have this in parameters? (it' a multipart/form-data content-type...)
  Product.findOne({
    _id: productId
  })
  .exec(async(err, product) => {
    if (err) {
      logger.error("Error finding product:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (!product) {
      return res.status(400).json({ message: req.t("Product not found") });
    }

    try {
      result = await saveImageFile(req.file);
      product.imageNameOriginal = result.imageNameOriginal;
      product.imageName = result.imageName;
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    product.save(async(err, product) => {
      if (err) {
        return res.status(err.code).json({ message: err.message });
      }
    });

    return res.status(200).json({ message: req.t("Image uploaded to {{fileName}}", { filename: product.imageName }) });
  });
};


// removes a product: mark it as deleted, but do not delete from database
const removeProduct = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // TODO: attention here, we are deleting ALL products!
    filter = {};
  } else
  if (isObject(filter)) {
    ;
  } else
  if (isArray(filter)) {
    filter = { _id: { $in: filter } };
  } else
    return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });

  const payload = { isDeleted: true };
  Product.updateMany(filter, payload, {new: true, lean: true}, async(err, data) => {
    if (err) {
      logger.error("Error finding product:", err);
      return next(Object.assign(new Error(err.message), { status: 500 }));
    }
    if (data.nModified > 0) {
      return res.status(200).json({ message: req.t("{{count}} products(s) have been removed", { count: data.nModified }), count: data.nModified });
    } else {
      return res.status(400).json({ message: req.t("No product have been removed") });
    }
  });

};
  

// user properties validation
const propertyMdaCodeValidate = async(req, value, product) => { // validate and normalize mda code
  // ... TODO ...
  return [null, value];
};

module.exports = {
  getAllProducts,
  getProducts,
  getProduct,
  getProductImageById,
  getProductAllConstraintsById,
  insertProduct,
  updateProduct,
  uploadProductImage,
  deleteProduct,
  removeProduct,
};

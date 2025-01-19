
//const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Product = require("../models/product.model");
const { logger } = require("./logger.controller");
const { saveImageFile } = require("../helpers/images");
const { isObject, isArray, isDealerAtLeast, diacriticMatchRegex, diacriticsRemove } = require("../helpers/misc");
const config = require("../config");


const getProducts = async (req, res/*, next*/) => {

  try {
    filter = req.parameters.filter ?? {};
    if (typeof filter !== "object") {
      return res.status(400).json({ message: req.t("A filter must be an object") });
    }

    // trim all filter values
    Object.keys(filter).forEach(k => filter[k] = filter[k].trim());

    // build mongo filter from input filter object
    const mongoFilter = {};
    for (const [key, value] of Object.entries(filter)) {
      if (!value) continue; // ignore empty strings
      let filterKey;

      const cleanValue = diacriticsRemove(value); // remove diacritics
      const $options = config.db.products.search.caseInsensitive ? "i" : "";
      let escapedValue = cleanValue;
      try { // if value is a valid regex string (new RegExp() will not throw), use it directly
        new RegExp(cleanValue);
      } catch { // if value is a not valid regex string (new RegExp() has thrown), escape special regex characters for literal matching
        escapedValue = cleanValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      //const keyOptions = Product.schema.path(key).options;
      
      if (Product.schema.path(key).options.searchable) { // this key is "searchable", normalize it across diacritics
        const pattern = diacriticMatchRegex(escapedValue, (config.db.products.search.mode === "EXACT"));
        filterKey = { $regex: pattern, $options };
      } else {
        filterKey = escapedValue;
      }

      // we do not need special handling for arrays if arrays contents are strings
      mongoFilter[key] = filterKey;
    }

    const mongoCollation = { locale: "en", strength: 1 }; // diacritic and case insensitive

    let limit = 0; // a limit value of 0 is equivalent to setting no limit
    if (!await isDealerAtLeast(req.userId)) { // check if request is from a dealer, at least
      limit = config.products.limitForNonDealers;
    }

    // count the filter results (with no limit)
    const totalCount = await Product.countDocuments(mongoFilter).collation(mongoCollation);

    // fetch the limited set of results
    const products = await Product.find(mongoFilter)
      .collation(mongoCollation)
      .limit(limit)
      .select(["-__v"])
      .lean()
      .exec()
    ;
    
    //product.id = product._id;

    return res.status(200).json({products, count: totalCount});
  } catch(err) {
    logger.error("Error getting products:", err, err.stack);
    throw err;
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

// serve product all types
const getProductAllTypes = (req, res) => {
  return res.status(200).json({
    types: ["motorino", "alternatore"],
  });
};

// deletes a product: delete it from database
const deleteProduct = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL products!
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
    logger.error("Could not delete product(s) with filter ${JSON.stringify(filter)}:", err);
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
      return res.status(200).json({ id: product._id, message: req.t("Product has been inserted") });
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
    if ((productNew.oemCode !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.oemCode, productNew);
      if (message) return res.status(400).json({ message });
      product.oemCode = value;
    }
    if ((productNew.make !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.make, productNew);
      if (message) return res.status(400).json({ message });
      product.make = value;
    }
    if ((productNew.models !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.models, productNew);
      if (message) return res.status(400).json({ message });
      product.models = value;
    }
    if ((productNew.application !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.application, productNew);
      if (message) return res.status(400).json({ message });
      product.application = value;
    }
    if ((productNew.kw !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.kw, productNew);
      if (message) return res.status(400).json({ message });
      product.kw = value;
    }
    if ((productNew.volt !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.volt, productNew);
      if (message) return res.status(400).json({ message });
      product.volt = value;
    }
    if ((productNew.ampere !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.ampere, productNew);
      if (message) return res.status(400).json({ message });
      product.ampere = value;
    }
    if ((productNew.teeth !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.teeth, productNew);
      if (message) return res.status(400).json({ message });
      product.teeth = value;
    }
    if ((productNew.rotation !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.rotation, productNew);
      if (message) return res.status(400).json({ message });
      product.rotation = value;
    }
    if ((productNew.regulator !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.regulator, productNew);
      if (message) return res.status(400).json({ message });
      product.regulator = value;
    }
    if ((productNew.notes !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.notes, productNew);
      if (message) return res.status(400).json({ message });
      product.notes = value;
    }
    if ((productNew.type !== undefined)) {
      [message, value] = await propertyValidate(req, productNew.type, productNew);
      if (message) return res.status(400).json({ message });
      product.type = value;
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
  // we don't have req.parameters set in this endpoint because it' a multipart/form-data content-type
  if (!req.file) { // no image uploaded
    res.status(400).json({ error: req.t("No image uploaded") });
  }

  const productId = req.body.productId;
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
      result = await saveImageFile(req);
      product.imageNameOriginal = result.imageNameOriginal;
      product.imageName = result.imageName;
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    product.save(async(err/*, product*/) => {
      if (err) {
        return res.status(err.code).json({ message: err.message });
      }
    });

    return res.status(200).json({ message: req.t("Image uploaded to {{fileName} from {{file}}", { fileName: product.imageName, file: req.file }) });
  });
};


// removes a product: mark it as deleted, but do not delete from database
const removeProduct = async(req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL products!
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
const propertyValidate = async(req, value/*, product*/) => { // generic product type validation
  return [null, value];
};

const propertyMdaCodeValidate = async(req, value/*, product*/) => { // validate and normalize mda code
  // ... TODO ...
  return [null, value];
};

module.exports = {
  //getAllProducts,
  getProducts,
  getProduct,
  getProductImageById,
  getProductAllTypes,
  insertProduct,
  updateProduct,
  uploadProductImage,
  deleteProduct,
  removeProduct,
};

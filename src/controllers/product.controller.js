//const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/product.model");
//const { logger } = require("./logger.controller");
const { saveImageFile } = require("../helpers/images");
const { isObject, isArray, diacriticMatchRegex, diacriticsRemove, nextError } = require("../helpers/misc");
const config = require("../config");


const getProducts = async (req, res, next) => {
  try {
    const filter = req.parameters.filter ?? {};
    if (typeof filter !== "object") {
      //console.log(1)
      return res.status(400).json({ message: req.t("A filter must be an object") });
    }

    const restrictProducts = req.restrictProducts ?? 0;

    // trim all filter values
    Object.keys(filter).forEach(k => filter[k] = filter[k].trim());

    // build mongo filter from input filter object
    const mongoFilter = {};
    for (const [key, value] of Object.entries(filter)) {
      if (!value) continue; // ignore empty strings
      let filterKey;

      const cleanValue = diacriticsRemove(value); // remove diacritics
      const $regexOptions = config.db.products.search.caseInsensitive ? "i" : "";
      let escapedValue = cleanValue;
      try { // if value is a valid regex string (new RegExp() will not throw), use it directly
        new RegExp(cleanValue);
      } catch { // if value is a not valid regex string (new RegExp() has thrown), escape special regex characters for literal matching
        escapedValue = cleanValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      if (Product.schema.path(key).options.searchable) { // this key is "searchable", normalize it across diacritics
        const pattern = diacriticMatchRegex(escapedValue, (config.db.products.search.mode === "EXACT"));
        filterKey = { $regex: pattern, $options: $regexOptions };
      } else {
        filterKey = escapedValue;
      }

      // we do not need special handling for arrays if arrays contents are strings
      mongoFilter[key] = filterKey;
    }

    const mongoCollation = { locale: "en", strength: 1 }; // diacritic and case insensitive

    // count the filter results (with no restriction)
    const totalCount = await Product.countDocuments(mongoFilter).collation(mongoCollation);

    // fetch the restricted set of results
    const products = await Product.find(mongoFilter)
      .collation(mongoCollation)
      .limit(restrictProducts)
      .select(["-__v"])
      .lean()
      .exec()
    ;
    
    return res.status(200).json({products, count: totalCount});
  } catch (err) {
    return nextError(next, req.t("Error getting products: {{err}}", { err: err.message }), 500, err.stack);
  }
};

// get product data by id
const getProduct = async (req, res, next) => {
  try {
    const productId = req.parameters.productId;
    const deletedToo = req.parameters.deletedToo ?? false;
    if (!mongoose.isValidObjectId(productId)) {
      return nextError(next, req.t("Invalid ObjectId {{productId}}", { productId }), 400);
    }
    const product = await Product.findOne(
      { _id: productId },
      null,
      { allowDeleted: deletedToo }
    );
    if (!product) {
      return nextError(next, req.t("Could not find any product by id {{id}}", { id: productId }), 400);
    }
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
  } catch (err) {
    return nextError(next, req.t("Error getting product: {{err}}", { err: err.message }), 500, err.stack);
  }
};

// serve product image by id
const getProductImageById = (req, res) => {
  const imageId = req.parameters.imageId;
  const imagePath = path.join(__dirname, "images", imageId);

  //console.log("+++ imageId:", imageId)
  //console.log("+++ imagePath:", imagePath)

  // check if the image exists
  if (!fs.existsSync(imagePath)) {
     //console.log("+++ 404")
    return res.status(404).json({ message: req.t("Image by id {{id}} not found", { id: imageId }) });
  }
  
  //console.log("+++ imagePath 2:", imagePath)
  return res.sendFile(imagePath);
};

// serve product all types
const getProductAllTypes = (req, res) => {
  return res.status(200).json({
    types: ["motorino", "alternatore"],
  });
};


/**
 * Insert new product
 */
const insertProduct = async (req, res, next) => {
  const productNew = req.parameters.product;
  if (!productNew) {
    return res.status(400).json({ message: req.t("Please specify a product") });
  }

  const product = new Product(productNew);
  try {
    await product.save();
    return res.status(200).json({ id: product._id, message: req.t("Product has been inserted") });
  } catch (err) {
    return nextError(next, req.t("Error saving product to insert: {{err}}", { err: err.message }), 500, err.stack);
  }
};

/**
 * Update current product
 */
const updateProduct = async (req, res, next) => {
  const productId = req.parameters.productId;
  const productNew = req.parameters.product;

  try {
    const product = await Product.findOne({
      _id: productId
    });
      
    if (!product) {
      return res.status(400).json({ message: req.t("Product not found") });
    }

    // validate and normalize fields
    let [message, value] = [null, null];

    //console.log(1);
    if ((productNew.mdaCode !== undefined)) {
      //console.log(2);
      [message, value] = await propertyMdaCodeValidate(req, productNew.mdaCode, productNew);
      if (message) return res.status(400).json({ message });
      //console.log(3);
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

    //console.log(4);
    try {
      await product.save();
      return res.status(200).json({ product });
    } catch (err) {
      //console.log(5, err);
      return nextError(next, req.t("Error saving product to update: {{err}}", { err: err.message }), 500, err.stack);
    }
    //console.log(6);
  } catch (err) {
    //console.log(7, err);
    return nextError(next, req.t("Error finding product to update: {{err}}", { err: err.message }), 500, err.stack);
  }
};

// upload product image
const uploadProductImage = async (req, res, next) => {
  //console.log(1);
  // we don't have req.parameters set in this endpoint because it' a multipart/form-data content-type
  if (!req.file) { // no image uploaded
    res.status(400).json({ error: req.t("No image uploaded") });
  }
  //console.log(2);

  const productId = req.body.productId;
  try {
    //console.log(3);
    const product = await Product.findOne({
      _id: productId
    });

    if (!product) {
      //console.log(4);
      return res.status(400).json({ message: req.t("Product not found") });
    }

    try {
      //console.log(5);
      const result = await saveImageFile(req);
      //console.log(6);
      product.imageNameOriginal = result.imageNameOriginal;
      product.imageName = result.imageName;
    } catch (err) {
      //console.log(7, err);
      return nextError(next, req.t("Error saving product image: {{err}}", { err: err.message }), 500, err.stack);
    }

    try {
      //console.log(8);
      await product.save();
      //console.log(9);
    } catch (err) {
      return nextError(next, req.t("Error updating product: {{err}}", { err: err.message }), 500, err.stack);      
    }

    //console.log(10);
    return res.status(200).json({ message: req.t("Image uploaded to {{fileName} from {{filePath}}", { fileName: product.imageName, filePath: req.file.path }) });
  } catch (err) {
    //console.log(11, err.message);
    return nextError(next, req.t("Error finding product: {{err}}", { err: err.message }), 500, err.stack);      
  }
};

// deletes a product: delete it from database
const deleteProduct = async (req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL products!
    filter = {};
  } else {
    if (isObject(filter)) {
      // do nothing
    } else {
      if (isArray(filter)) {
        filter = { _id: { $in: filter } };
      } else {
        return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });
      }
    }
  }
  try {
    const data = await Product.deleteMany(filter);
    if (data.deletedCount > 0) {
      return res.status(200).json({ message: req.t("{{count}} product(s) have been deleted", { count: data.deletedCount }), count: data.deletedCount });
    } else {
      return res.status(200).json({ message: req.t("No product has been deleted") });
    }
  } catch (err) {
    return nextError(next, req.t("Error deleting product(s): {{err}}", { err: err.message }), 500, err.stack);
  }
};

// removes a product: mark it as deleted, but do not delete from database
const removeProduct = async (req, res, next) => {
  let filter = req.parameters?.filter;
  if (filter === "*") { // attention here, we are deleting ALL products!
    filter = {};
  } else {
    if (isObject(filter)) {
      // do nothing
    } else {
      if (isArray(filter)) {
        filter = { _id: { $in: filter } };
      } else {
        return res.status(400).json({ "message": req.t("Filter must be specified and be '*' or a filter object or an array of ids") });
      }
    }
  }

  const payload = { isDeleted: true };
  try {
    const data = await Product.updateMany(filter, payload, { new: true, lean: true });
    if (data.modifiedCount > 0) {
      //console.log(1, data.modifiedCount);
      return res.status(200).json({ message: req.t("{{count}} product(s) have been removed", { count: data./*nModified*/modifiedCount }), count: data./*nModified*/modifiedCount });
    } else {
      //console.log(2, data.modifiedCount);
      return res.status(400).json({ message: "No products have been removed" });
    }
  } catch (err) {
    //console.log(1, err);
    return nextError(next, req.t("Error updating product to remove: {{err}}", { err: err.message }), 500, err.stack);      
  }
};
  

// user properties validation
const propertyValidate = async (req, value/*, product*/) => { // generic product type validation
  if (value instanceof Error) { // TODO: implement meaningful checks, according to application specification
    return "property is not valid";
  }
  return [null, value];
};

const propertyMdaCodeValidate = async (req, value/*, product*/) => { // validate and normalize mda code
  // TODO: validate this code according to application specification
  if (value instanceof Error) { // TODO: implement meaningful checks, according to application specification
    return "property is not valid";
  }
  return [null, value];
};

module.exports = {
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

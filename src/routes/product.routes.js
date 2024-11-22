const multer = require("multer");
const controller = require("../controllers/products.controller");
const { authJwt } = require("../middlewares");

const path = "/api/product";

// image upload setup using multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = app => {
  app.get(`${path}/getAllProducts`, [authJwt.verifyAccessToken], controller.getAllProducts);
  app.get(`${path}/getProducts`, [authJwt.verifyAccessToken], controller.getProducts);
  //app.post(`${path}/uploadImage`, [authJwt.verifyAccessToken, upload.single("image")], controller.uploadImage);
  app.post(`${path}/getProduct`, [authJwt.verifyAccessToken], controller.getProduct);
  app.post(`${path}/getProductImageById/:imageId`, [authJwt.verifyAccessToken], controller.getProductImageById);
  app.post(`${path}/getProductAllConstraintsById`, [authJwt.verifyAccessToken], controller.getProductAllConstraintsById);
  app.post(`${path}/insertProduct`, [authJwt.verifyAccessToken], controller.insertProduct);
  app.post(`${path}/updateProduct`, [authJwt.verifyAccessToken], controller.updateProduct);
  app.post(`${path}/uploadProductImage`, [authJwt.verifyAccessToken, upload.single("image")], controller.uploadProductImage);
  app.post(`${path}/deleteProduct`, [authJwt.verifyAccessToken], controller.deleteProduct); // be careful !
  app.post(`${path}/removeProduct`, [authJwt.verifyAccessToken], controller.removeProduct);
  // app.post(`${path}/uploadProductImage`, upload.single("image"), (req, res, next) => {
  //   if (req.file) {
  //     // image uploaded successfully
  //     res.json({ message: "image uploaded successfully", filename: req.file.filename });
  //   } else {
  //     // no image uploaded
  //     res.status(400).json({ error: "No image uploaded" });
  //   }
  // });
};

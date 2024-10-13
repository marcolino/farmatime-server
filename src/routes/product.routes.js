const multer = require("multer");
const controller = require("../controllers/products.controller");
const { authJwt } = require("../middlewares");

const path = "/api/product";

// image upload setup using multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = app => {
  app.get(`${path}/getAllProducts`, [authJwt.verifyToken], controller.getAllProducts);
  //app.post(`${path}/uploadImage`, [authJwt.verifyToken, upload.single("image")], controller.uploadImage);
  app.post(`${path}/getProduct`, [authJwt.verifyToken], controller.getProduct);
  app.post(`${path}/getProductImageById/:imageId`, [authJwt.verifyToken], controller.getProductImageById);
  app.post(`${path}/getProductAllConstraintsById`, [authJwt.verifyToken], controller.getProductAllConstraintsById);
  app.post(`${path}/insertProduct`, [authJwt.verifyToken], controller.insertProduct);
  app.post(`${path}/updateProduct`, [authJwt.verifyToken], controller.updateProduct);
  app.post(`${path}/uploadProductImage`, [authJwt.verifyToken, upload.single("image")], controller.uploadProductImage);
  app.post(`${path}/deleteProduct`, [authJwt.verifyToken], controller.deleteProduct); // be careful !
  app.post(`${path}/removeProduct`, [authJwt.verifyToken], controller.removeProduct);
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

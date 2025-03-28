const multer = require("multer");
const controller = require("../controllers/product.controller");
const { authJwt } = require("../middlewares");

const path = "/api/product";

// image upload setup using multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = app => {
  //app.get(`${path}/getAllProducts`, [authJwt.verifyAccessToken], controller.getAllProducts);
  app.get(`${path}/getProducts`, [authJwt.verifyAccessTokenAllowGuest, authJwt.verifyRestrictProducts], controller.getProducts);
  app.get(`${path}/getProduct`, [authJwt.verifyAccessTokenAllowGuest], controller.getProduct);
  app.get(`${path}/getProductImageById/:imageId`, [authJwt.verifyAccessToken], controller.getProductImageById);
  app.get(`${path}/getProductAllTypes`, [authJwt.verifyAccessToken], controller.getProductAllTypes);
  app.post(`${path}/insertProduct`, [authJwt.verifyAccessToken], controller.insertProduct);
  app.post(`${path}/updateProduct`, [authJwt.verifyAccessToken], controller.updateProduct);
  app.post(`${path}/uploadProductImage`, [authJwt.verifyAccessToken, upload.single("image")], controller.uploadProductImage);
  app.post(`${path}/deleteProduct`, [authJwt.verifyAccessToken], controller.deleteProduct);
  app.post(`${path}/removeProduct`, [authJwt.verifyAccessToken], controller.removeProduct);
};

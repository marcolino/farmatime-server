const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { hashString } = require("./misc");
const i18n = require("../middlewares/i18n");
const config = require("../config");

const saveImageFile = async(file) => {
  const imageNameOriginal = file.originalname;
  const imageBuffer = file.buffer;
  const imageName = hashString(imageNameOriginal) + `.${config.products.images.format}`;
  const filepath = path.join(__dirname, "../..", config.products.images.path, imageName);
  const filepathWaterMark = path.join(__dirname, "../..", config.products.images.pathWaterMark, imageName);

  console.log("__dirname:", __dirname);
  console.log("imageName:", imageName);
  //const filepath = path.join(__dirname, "../../public/assets/products/images", imageName);

  imageBufferConvertedAndResized = await imageConvertFormatAndLimitSize(imageBuffer);
  try { // save image to disk
    fs.writeFileSync(filepath, imageBufferConvertedAndResized);
  } catch (err) {
    console.error(i18n.t("Error writing image to {{filepath}}", { filepath }));
    throw err;
  }

  imageBufferWithWaterMark = await imageAddWaterMark(imageBuffer);
  try { // save image to disk
    fs.writeFileSync(filepathWaterMark, imageBufferWithWaterMark);
  } catch (err) {
    console.error(i18n.t("Error writing image to {{filepathWaterMark}}", { filepathWaterMark }));
    throw err;
  }
  return {
    imageNameOriginal,
    imageName,
  };
};

const imageConvertFormatAndLimitSize = async(imageBuffer) => {
  return await sharp(imageBuffer)
    .resize(config.products.images.maximumSidePixels, config.products.images.maximumSidePixels, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: config.products.images.qualityPercent,
      alphaQuality: config.products.images.alphaQualityPercent,
    })
    .toBuffer()
  ;
};

const imageAddWaterMark = async (imageBuffer) => {
  const watermarkImagePath = path.join(__dirname, "..", "assets/images/watermark.png"); // the watermark image
  const watermarkPercentWidth = 33; // TODO: to config
  const watermarkPercentOpacity = 12; // TODO: to config
  
  // load the input image to get its dimensions
  return await sharp(imageBuffer)
    .metadata()
    .then(async({ width }) => {

      const watermarkOpacized = await sharp(watermarkImagePath)
        .composite([{
          input: Buffer.from([255, 255, 255, Math.round((watermarkPercentOpacity / 100) * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in"
        }])
        .toBuffer()
      ;
      
      // resize the watermark relative to the input image width (e.g., 10% of the input image width)
      return await sharp(watermarkOpacized)
        .resize(Math.floor(width * (watermarkPercentWidth / 100))) // resize watermark
        .greyscale() // make it greyscale
        .linear(1.5, 0) // increase the contrast
        .toBuffer()
      ;
    })
    .then(watermarkBuffer => {
      return sharp(imageBuffer)
        .composite([ // composite the watermark with the input image
          {
            input: watermarkBuffer,
            gravity: "center", // position the watermark
            blend: "over", // blending mode
          }
        ])
        .toBuffer()
      ;
    })
    .catch(err => {
      console.error("Error processing the image:", err);
    })
  ;
};

module.exports = {
  saveImageFile,
};

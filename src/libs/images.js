const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { hashString, dirSize } = require("../libs/misc");
const { audit } = require("../libs/messaging");
const { logger } = require("../controllers/logger.controller");
const i18n = require("../middlewares/i18n");
const config = require("../config");

const saveImageFile = async (req) => {
  const file = req.file;
  const imageNameOriginal = file.originalname;
  const imageBuffer = file.buffer;
  //console.log("imageBuffer:", imageBuffer)
  const imageName = hashString(imageNameOriginal) + `.${config.products.images.format}`;
  const imageDir = path.join(__dirname, "../..", config.products.images.path);
  const imageDirWaterMark = path.join(__dirname, "../..", config.products.images.pathWaterMark);
  const imagePath = path.join(imageDir, imageName);
  const imagePathWaterMark = path.join(imageDirWaterMark, imageName);

  //console.log("a")
  // create image folders, if not present
  if (!fs.existsSync(imageDir)) {
    logger.warn(`directory ${imageDir} does not exist, creating it!`);
    fs.mkdirSync(imageDir, { recursive: true });
  }
  //console.log("b")
  if (!fs.existsSync(imageDirWaterMark)) {
    logger.warn(`directory ${imageDirWaterMark} does not exist, creating it!`);
    fs.mkdirSync(imageDirWaterMark, { recursive: true });
  }

  // check persistent storage size, to avoid overcoming plan size limits
  //console.log("c")
  const size = await dirSize(imageDir);
  //logger.debug(`images directory {{imageDir}} size is`, size);
  const sizeAfterSave = size + (imageBuffer.length * 3); // we save 2 images, without watermark and with watermark; we multiply by 3 to be on the safe side...
  if (sizeAfterSave >= config.persistentStorage.size.overflow) {
    const subject = i18n.t("Image file save size overflow limit reached");
    const message = i18n.t("Persistent storage size overflow limit reached ({{overflow}}), image cannot be saved, storage plan should be boosted", { overflow: config.persistentStorage.size.overflow });
    const mode = "warning";
    //logger.warn(message);
    audit({req, mode, subject, htmlContent: message});
    throw new Error(message);
  }
  if (sizeAfterSave >= config.persistentStorage.size.watermark) {
    const subject = i18n.t("Image file save size watermark limit reached");
    const message = i18n.t("Persistent storage size watermark limit reached ({{watermark}}), image is saved, but storage plan should be boosted", { watermark: config.persistentStorage.size.watermark });
    const mode = "error";
    //logger.error(message);
    audit({req, mode, subject, htmlContent: message});
  }

  //console.log("d")
  let imageBufferConvertedAndResized;
  try {
    //console.log("e", imageBuffer)
    imageBufferConvertedAndResized = await imageConvertFormatAndLimitSize(imageBuffer);
  } catch (err) {
    throw new Error(i18n.t("Error converting image {{imageName}} ({{err}})", { imageName: imageNameOriginal, err: err.message }));
  }
  try { // save image to disk
    //console.log("g")
    fs.writeFileSync(imagePath, imageBufferConvertedAndResized);
    //console.log("h")
  } catch (err) {
    //console.log("i", err)
    throw new Error(i18n.t("Error writing image to {{imagePath}} ({{err}})", { imagePath, err: err.message }));
  }

  let imageBufferWithWaterMark;
  try { // add watermark
    //console.log("j")
    imageBufferWithWaterMark = await imageAddWaterMark(imageBuffer);
    //console.log("k")
  } catch (err) {
    //console.log("m", err)
    throw new Error(i18n.t("Error adding watermark to image {{imageName}} ({{err}})", { imageName: imageNameOriginal, err: err.message }));
  }
  try { // save image to disk
    //console.log("n")
    fs.writeFileSync(imagePathWaterMark, imageBufferWithWaterMark);
    //console.log("o")
  } catch (err) {
    //console.log("p", err)
    throw new Error(i18n.t("Error writing image to {{imagePath}} ({{err}})", { imagePath: imagePathWaterMark, err: err.message }));
  }

  //console.log("q", imageNameOriginal, imageName)
  return {
    imageNameOriginal,
    imageName,
  };
};

const imageConvertFormatAndLimitSize = async (imageBuffer) => {
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
    .catch (err => {
      throw new Error(i18n.t("Error processing image: {{err}}", { err: err.message }));
    })
  ;
};

const imageAddWaterMark = async (imageBuffer) => {
  try {
    // resize the input image to the maximum dimensions first
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(config.products.images.maximumSidePixels, config.products.images.maximumSidePixels, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    // get metadata of the resized image
    const { width, height } = await sharp(resizedImageBuffer).metadata();

    // process the watermark
    const watermarkPath = path.join(__dirname, "..", "..", config.app.ui.products.images.watermark.path);
    const watermarkOpacized = await sharp(watermarkPath)
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round((config.app.ui.products.images.watermark.percentOpacity / 100) * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ])
      .toBuffer();

    let watermarkWidth = Math.floor(width * (config.app.ui.products.images.watermark.percentWidth / 100));
    let resizedWatermarkBuffer = await sharp(watermarkOpacized)
      .resize({ width: watermarkWidth })
      .greyscale()
      .linear(config.app.ui.products.images.watermark.contrast, 0)
      .toBuffer();

    // check if the watermark height exceeds the image height
    let watermarkMetadata = await sharp(resizedWatermarkBuffer).metadata();
    if (watermarkMetadata.height > height) {
      const scaleFactor = height / watermarkMetadata.height; // calculate the scale factor
      watermarkWidth = Math.floor(watermarkWidth * scaleFactor); // adjust watermark width proportionally
      resizedWatermarkBuffer = await sharp(watermarkOpacized)
        .resize({ width: watermarkWidth })
        .greyscale()
        .linear(config.app.ui.products.images.watermark.contrast, 0)
        .toBuffer();

      watermarkMetadata = await sharp(resizedWatermarkBuffer).metadata(); // update metadata
    }

    // composite the watermark onto the resized input image
    const finalImageBuffer = await sharp(resizedImageBuffer)
      .composite([
        {
          input: resizedWatermarkBuffer,
          gravity: "center",
          blend: "over",
        },
      ])
      .webp({
        quality: config.products.images.qualityPercent,
        alphaQuality: config.products.images.alphaQualityPercent,
      })
      .toBuffer();

    return finalImageBuffer;
  } catch (err) {
    throw new Error(i18n.t("Error adding watermark to the image: {{err}}", { err: err.message }));
  }
};

module.exports = {
  saveImageFile,
};

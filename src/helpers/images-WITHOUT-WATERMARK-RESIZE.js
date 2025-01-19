const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { hashString, dirSize } = require("../helpers/misc");
const { audit } = require("../helpers/messaging");
const { logger } = require("../controllers/logger.controller");
const i18n = require("../middlewares/i18n");
const config = require("../config");

const saveImageFile = async (req) => {
  const file = req.file;
  const imageNameOriginal = file.originalname;
  const imageBuffer = file.buffer;
  const imageName = hashString(imageNameOriginal) + `.${config.products.images.format}`;
  const imageDir = path.join(__dirname, "../..", config.products.images.path);
  const imageDirWaterMark = path.join(__dirname, "../..", config.products.images.pathWaterMark);
  const imagePath = path.join(imageDir, imageName);
  const imagePathWaterMark = path.join(imageDirWaterMark, imageName);

  // create image folders, if not present
  if (!fs.existsSync(imageDir)) {
    logger.warn(`directory ${imageDir} does not exist, creating it!`);
    fs.mkdirSync(imageDir, { recursive: true });
  }
  if (!fs.existsSync(imageDirWaterMark)) {
    logger.warn(`directory ${imageDirWaterMark} does not exist, creating it!`);
    fs.mkdirSync(imageDirWaterMark, { recursive: true });
  }

  // check persistent storage size, to avoid overcoming plan size limits
  const size = await dirSize(imageDir);
  logger.debug(`images directory {{imageDir}} size is`, size);
  const sizeAfterSave = size + (imageBuffer.length * 3); // we save 2 images, without watermark and with watermark; we multiply by 3 to be on the safe side...
  if (sizeAfterSave >= config.persistentStorage.size.overflow) {
    const subject = i18n.t("Image file save size overflow limit reached");
    const message = i18n.t("Persistent storage size overflow limit reached ({{overflow}}), image cannot be saved, storage plan should be boosted", { overflow: config.persistentStorage.size.overflow });
    logger.error(message);
    audit({req, subject, htmlContent: message});
    throw new Error(message);
  }
  if (sizeAfterSave >= config.persistentStorage.size.watermark) {
    const subject = i18n.t("Image file save size watermark limit reached");
    const message = i18n.t("Persistent storage size watermark limit reached ({{watermark}}), image is saved, but storage plan should be boosted", { watermark: config.persistentStorage.size.watermark });
    logger.warn(message);
    audit({req, subject, htmlContent: message});
  }

  try {
    imageBufferConvertedAndResized = await imageConvertFormatAndLimitSize(imageBuffer);
  } catch (err) {
    const message = i18n.t("Error converting image {{imageName}}: {{err}}", { imageName: imageNameOriginal, err: err.message });
    logger.error(message);
    throw new Error(message);
  }
  try { // save image to disk
    fs.writeFileSync(imagePath, imageBufferConvertedAndResized);
  } catch (err) {
    const message = i18n.t("Error writing image to {{imagePath}}: {{err}}", { imagePath, err: err.message });
    logger.error(message);
    throw new Error(message);
  }

  try { // add watermark
    imageBufferWithWaterMark = await imageAddWaterMark(imageBuffer);
  } catch (err) {
    const message = i18n.t("Error adding watermark to image {{imageName}}: {{err}}", { imageName: imageNameOriginal, err: err.message });
    logger.error(message);
    throw new Error(message);
  }
  try { // save image to disk
    fs.writeFileSync(imagePathWaterMark, imageBufferWithWaterMark);
  } catch (err) {
    const message = i18n.t("Error writing image to {{imagePath}}: {{err}}", { imagePath: imagePathWaterMark, err: err.message });
    logger.error(message);
    throw new Error(message);
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
    .catch(err => {
      logger.error("Error processing the image:", err);
      throw err;
    })
  ;
};

const imageAddWaterMark = async(imageBuffer) => {
  try {
    // resize the input image to the maximum dimensions first
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(config.products.images.maximumSidePixels, config.products.images.maximumSidePixels, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    // process the watermark
    const { width } = await sharp(resizedImageBuffer).metadata();

    const watermarkOpacized = await sharp(
      path.join(__dirname, "..", config.app.ui.products.images.watermark.path)
    )
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round((config.app.ui.products.images.watermark.percentOpacity / 100) * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in"
      }])
      .toBuffer();

    const resizedWatermarkBuffer = await sharp(watermarkOpacized)
      .resize(Math.floor(width * (config.app.ui.products.images.watermark.percentWidth / 100)))
      .greyscale()
      .linear(config.app.ui.products.images.watermark.contrast, 0)
      .toBuffer();

    // composite the watermark onto the resized input image
    const finalImageBuffer = await sharp(resizedImageBuffer)
      .composite([{
        input: resizedWatermarkBuffer,
        gravity: "center",
        blend: "over",
      }])
      .webp({
        quality: config.products.images.qualityPercent,
        alphaQuality: config.products.images.alphaQualityPercent,
      })
      .toBuffer();

    return finalImageBuffer;
  } catch (err) {
    logger.error("Error adding watermark to the image:", err);
    throw err;
  }
};

module.exports = {
  saveImageFile,
};

const sharp = require("sharp");

module.exports = async(mainImagePath, watermarkPath, outputPath, opacity = 0.5) => {
  try {
    // Read the main image
    const mainImage = sharp(mainImagePath);

    // Read the watermark image and resize it to 25% of the main image"s width
    const mainMetadata = await mainImage.metadata();
    const watermarkWidth = Math.round(mainMetadata.width * 0.25);

    const watermark = await sharp(watermarkPath)
      .resize({ width: watermarkWidth })
      .toBuffer();

    // Adjust watermark opacity
    const adjustedWatermark = await sharp(watermark)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in"
      }])
      .toBuffer();

    // Composite the watermark onto the main image
    await mainImage
      .composite([{
        input: adjustedWatermark,
        gravity: "southeast",
        blend: "over"
      }])
      .webp()
      .toFile(outputPath);

    console.log("Watermark added successfully!");
  } catch (error) {
    console.error("Error adding watermark:", error);
  }
}

const Jimp = require("jimp");
const fs = require("fs");

const wm = imageBuffer => {
	return new Promise(async (resolve, reject) => {
		try {
			const image = await Jimp.read(imageBuffer);
			const watermark = await Jimp.read(
				fs.readFileSync("../public/assets/images/wm.png"),
			);

			watermark.resize(image.bitmap.width / 10, Jimp.AUTO);

			const xMargin = 40;
			const yMargin = 40;
			const x = xMargin;
			const y = image.bitmap.height - watermark.bitmap.height - yMargin;

			image.composite(watermark, x, y, {
				mode: Jimp.BLEND_SOURCE_OVER,
				opacitySource: 0.5,
			});

			const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
			console.log(outputBuffer)
			resolve(outputBuffer);
		} catch (err) {
			console.error("Failed to add watermark:", err);
			reject(err);
		}
	});
};

module.export = wm;

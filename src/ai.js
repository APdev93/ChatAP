const axios = require("axios");
const { ImageGen } = require("./bing");
const Jimp = require("jimp");
const fs = require("fs");
const root = process.cwd();

const wm = imageBuffer => {
	return new Promise(async (resolve, reject) => {
		try {
			const image = await Jimp.read(imageBuffer);
			const watermark = await Jimp.read(
				fs.readFileSync(`${root}/public/assets/images/wm.png`),
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
			console.log(outputBuffer);
			resolve(outputBuffer);
		} catch (err) {
			console.error("Failed to add watermark:", err);
			reject(err);
		}
	});
};

const cookies = [
	"10g0hhWnfelLm8N32MU1ATKECUTaRLBYwC-M7lfO7euODTQOGs3HStuLHtx-ShkEZHtackX5AFUGCtx2dG2iUX_It7TA5198oMkj_A4IIuTXQ-3vF8Us4Vuz8fLevtFD4LAtGygDA4k4_wG73TAtqU6sC_Oax1V9RpC0acJ4B9I4eK2Fr3q4d6Bc4gfj5kJEYhEr_UaHog56f9efTE8zCpw",
	"1tBqBgOXDewYQsibIlviW6vbFU3FPcbfMLqetjMOQ0K9-CC0t40uynErXyBoOck1OdHpzAlmA8_kilSx-KfT8WhjPPIQkXhnzPaKM5ZkYSs9Rr2FwLM4Za3Xm6-vJjq92daNK4Ms1B3-YBHq9U_arzaeMUB4yOK8HL2NTGyWjf4KsJlhf4XteUs3iPrT2KaVyy3xAZuoTTfX4YrMyULbnHQ",
	"1M39JTr1YlY2n5r-qNBQUCNdFuFY_QdK6qF6_m8Klq5nQSOguLI89oZiJuQfkWy3wna2CyYhUhefwoZyUwrmEcuI4SA-DC5hC29OafQXartJkLAOa3exvezfCACbqpKL2_1xRnhQr4zNXkxU94k_3YcSrCzf5HwKyR-g63_E1AgSy78c6n7cOb7LgZjIIRd0MQ_Olp9VoeEccW3c8sdriZgZWijAUUun_oOPtzUNUIHM",
];

function getRandom(array) {
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
}

async function generateImage(prompt) {
	try {
		const bing = new ImageGen(getRandom(cookies));
		let response = await bing.get_images(prompt);
		let img = response.map(url => url.replace(/\.svg$/, ""));
		console.log(img);
		if (img) {
			let imageWithWm = await wm(img[2]);
			if (imageWithWm) {
				return {
					author: "APdev",
					success: true,
					image: imageWithWm,
				};
			} else {
				return {
					author: "APdev",
					success: false,
					image: "Can't generate image, maybe the prompt isn't allowed",
				};
			}
		} else {
			return {
				author: "APdev",
				success: false,
				image: "Can't generate image, maybe the prompt isn't allowed",
			};
		}
	} catch (err) {
		return {
			author: "APdev",
			success: false,
			image: "An error occurred while generating the image",
		};
	}
}

async function gpt(data) {
	const json = {
		messages: [
			{
				role: "system",
				content:
					"RoleName: ApAi. Pembuat: APdev. usahakan jawaban tidak terlalu panjang",
			},
			...data,
		],
	};

	try {
		const { data } = await axios.post(
			"https://chatbot-ji1z.onrender.com/chatbot-ji1z",
			json,
		);
		console.log(data);
		return {
			author: "APdev",
			success: true,
			data: data.choices[0].message.content,
		};
	} catch (err) {
		console.log(err);
		return {
			author: "APdev",
			success: false,
			data: "Unknown error, Plz contact owner",
		};
	}
}

const jsonExtractor = text => {
	try {
		const jsonStart = text.indexOf("{");
		const jsonEnd = text.lastIndexOf("}") + 1;
		const jsonString = text.slice(jsonStart, jsonEnd);

		const parsedData = text.includes("}")
			? JSON.parse(jsonString)
			: { msg: text };
		const { cmd, cfg, msg, energy } = parsedData;

		return {
			cmd: cmd,
			cfg: cfg,
			msg: msg,
		};
	} catch (error) {
		console.error("Error extracting or parsing JSON:", error);
		return {
			cmd: null,
			cfg: null,
			msg: text,
		};
	}
};

async function checkPrompt(prompt) {
	try {
		const messages = [
			{
				role: "system",
				content: `Ini adalah command check, jika user menyuruh untuk pembuatan gambar, logo dan sejenisnya, maka hasilkan respon json seperti ini:
				{
				    "cmd":"imaging",
				    "cfg":null,
				    "msg": null,
				},
				
				HASILKAN RESPON DI ATAS HANYA KETIKA USER MEMINTA PEMBUATAN GAMBAR/LOGO, DAN SEJENISNYA\n
				Jika tidak, maka hasilkan respon json saja seperti ini:
				
			    {
				    "cmd":"text_completion",
				    "cfg":null,
				    "msg": null,
				},
				\n
				
				HASILKAN HANYA RESPON JSON Seperti di atas, 
				`,
			},
			{
				role: "user",
				content: `${prompt}`,
			},
		];

		const response = await axios.post(
			"https://chatbot-ji1z.onrender.com/chatbot-ji1z",
			{ messages },
			{
				headers: {
					Accept: "text/event-stream",
					"Content-Type": "application/json",
				},
			},
		);

		if (response.data) {
			const checked = await jsonExtractor(
				response.data.choices[0].message.content,
			);

			if (checked.cmd === "imaging") {
				return {
					cmd: "imaging",
					cfg: null,
					msg: null,
				};
			} else {
				return {
					cmd: "text_completion",
					cfg: null,
					msg: null,
				};
			}
		} else {
	throw new Error("Unexpected response structure");
		}
	} catch (e) {

		console.error("Error in checkPrompt:", e.message || e);
		throw e;
	}
}

async function GPT4o(data) {
	try {
		const messages = [
			{
				role: "system",
				content: `This is ChatAP, Named ApAI, the latest AI assistant from APbiz, based on GPT-4o.\n you can generate images, If the prompt indicates to create an image, then return a response like this:
				{
				    "cmd":"bingimg",
				    "cfg": {
				        "prompt":"prompt entered by the user"
				      },
				    "msg": "$prompt_gambar_yang_di_hasilkan_dari_ai,dan penjelasan gambar"
				} . Jika tidak, respon seperti biasanya`,
			},
			...data,
		];

		const response = await axios.post(
			"https://chatbot-ji1z.onrender.com/chatbot-ji1z",
			{ messages },
			{
				headers: {
					Accept: "text/event-stream",
					"Content-Type": "application/json",
				},
			},
		);

		let answer = await jsonExtractor(response.data.choices[0].message.content);
		console.log(answer);
		if (answer.cmd == "bingimg") {
			const prompt = answer.cfg.prompt;
			const message = answer.msg || "Okay, I'm creating an image for you!";

			try {
				const data = await generateImage(prompt);
				let base64Image = data.image.toString("base64");
				const imgSrc = `data:image/png;base64,${base64Image}`;
				if (data.success) {
					return {
						status: true,
						message: answer.msg,
						image: imgSrc,
						author: "AP",
					};
				} else {
					return { status: false, image: null, author: "AP" };
				}
			} catch (error) {
				console.error("Um, it looks like something went wrong.", error);
				return { status: false, image: null, author: "AP" };
			}
		} else {
			return { data: answer.msg, author: "AP" };
		}
	} catch (e) {
		throw e;
	}
}

module.exports = { checkPrompt, gpt, generateImage, GPT4o };

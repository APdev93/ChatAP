const axios = require("axios");
const { ImageGen } = require("./bing");
const Jimp = require("jimp");
const fs = require("fs");
const geminiKey = "AIzaSyDDhOuxa13exugJQcMQsiWUacOJq2DGSL4";
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const cheerio = require("cheerio");
const https = require("https");

const root = process.cwd();
const now = new Date();

const day = now.getDate();
const month = now.getMonth() + 1;
const year = now.getFullYear();
const hours = now.getHours().toString().padStart(2, "0");
const minutes = now.getMinutes().toString().padStart(2, "0");
const seconds = now.getSeconds().toString().padStart(2, "0");
const dayOfWeek = now.getDay();

const daysOfWeek = [
	"Minggu",
	"Senin",
	"Selasa",
	"Rabu",
	"Kamis",
	"Jumat",
	"Sabtu",
];
const monthsOfYear = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

const dayName = daysOfWeek[dayOfWeek];
const monthName = monthsOfYear[month - 1];

const formattedDateTime = `Jam: ${hours}:${minutes}, Hari:${dayName}, tanggal:${day} bulan:${monthName} tahun:${year}`;

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
	"1cQ11ef498Fb-n5ygG2IwMEBSdMmI2GADtOFu5A0bZd0El7y-GYsbebMH2hBKdhAjBLhhNOQPAg53IXjWvcWKpcZV-8MVkNRUYzcNSyKQRUB7I61IjbudDDQkJ9jIvQYYkhmnnGqgrGYEIUmu5sSGZdWM8X6uE0wRfsppma1I6ZN9_3NI3iURxhRDV45BUd1iujokR5EFG8DYjZ36UCp9sg",
	"1PRbjGHKlxZ60R8xNDVUfthsB9yWOY8NtmW4iEJZHDIFI9gzXn_jWuE2F9Kk45flFJ0_pEs876UoQyWot90CPUxhAd2QiuXWTZPX-oA_WqNlQBVMyHKU823hLafUEVC9cMhXA1elvlkqsGfdpcQQs18IOoL0tXbLUXPSFTQekiEPUhh9cMf8gH08QVshXVS-1oUrwJEqGoV8BBpZ79DsrWg",
	"1OfAknMstfJWW_yeJzazts0ewGsYZZO60D-aiSaN7FdOSnloLrqgAelmYTj70_aW1ufJRMFTqjWCihiqhztyb66u-cDmJLuqdhbVzaGSXyyXd0j2IxfvTV6uqFrJDyIgRtiue_PZrzK2ozXHSfvSiiLdDFFDA5zQdmy850lbzpx7-9EPwVja_nZa0cG2EzXcHhie60opXmwsQvmHVCGi3bA",
	"1zO-ORtdQHI87EJufdjLcIkIAKd5aOvaszNpcaklsYY2gzSmMQFxTQJs_Lx3gCqKDuEjH9L2RrwXjTItaQjYklPtBxPJNARVQMR8sHnzR3Sa5BaiHhq1jX5pTXqD8m66TiBNh3BCmlp_NU3WUhulmy-Pj5lPljw349w9JyinKBVrX3jI09bKnm9wkhEiANPqtyNx3TaaKOSLuWE6W1_kZ7g",
];

function getRandom(array) {
	const randomIndex = Math.floor(Math.random() * array.length);

	return array[randomIndex];
}

async function searchWeb(query) {
	try {
		const response = await fetch(
			`https://api.yanzbotz.live/api/cari/google-search?query=${encodeURIComponent(
				query,
			)}`,
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		let text = "";
		data.result.results.forEach((result, index) => {
			text += `Title: ${result.title}\n`;
			text += `link: [[${index + 1}]](${result.url})\n`;
			text += `description: ${result.description}\n`;
			text += "\n";
		});

		return JSON.stringify(text);
	} catch (error) {
		console.error(
			`Error: ${error.toString()}. Report this error to Developer(YanzBotz)`,
		);
		return { error: error.message };
	}
}

const ua = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1661.62",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
];

const getRandomUserAgent = () => {
	return ua[Math.floor(Math.random() * ua.length)];
};

const fetchSearchResults = async (
	term,
	num,
	lang = "id",
	safe = "active",
	sslVerify = true,
	proxy = null,
	timeout = 5000,
	region = null,
) => {
	const response = await axios.get("https://www.google.com/search", {
		headers: {
			"User-Agent": getRandomUserAgent(),
		},
		params: {
			q: term,
			num: num + 2,
			hl: lang,
			safe: safe,
			gl: region,
		},
		httpsAgent: proxy ? new https.Agent({ rejectUnauthorized: sslVerify }) : null,
		timeout: timeout,
	});
	return response.data;
};

const searchGoogle = async (
	term,
	num = 10,
	proxy = null,
	sleepInterval = 0,
	region = null,
) => {
	let start = 0;
	const result = [];
	let totalResults = 0;

	while (totalResults < num) {
		const html = await fetchSearchResults(
			term,
			num - totalResults,
			"id",
			"active",
			true,
			proxy,
			5000,
			region,
		);
		const $ = cheerio.load(html);
		const resultBlock = $("div.g");
		let newResults = 0;

		resultBlock.each((_, element) => {
			const link = $(element).find("a").attr("href");
			const title = $(element).find("h3").text();
			const description = $(element)
				.find('div[style="-webkit-line-clamp:2"]')
				.text();

			if (link && title && description) {
				result.push({ url: link, title, description });
				totalResults++;
				newResults++;

				if (totalResults >= num) {
					return false;
				}
			}
		});

		if (newResults === 0) {
			break;
		}

		start += 10;
		await new Promise(res => setTimeout(res, sleepInterval));
	}
	console.log(result);
	return result;
};

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
			"https://api.deepenglish.com/api/gpt/chat",
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
				response.data.data.choices[0].message.content,
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

async function generateTopic(msg) {
	let percakapan = "";
	console.log("msg to checkkk: ", msg);
	/*
	msg.forEach(msg => {
		percakapan += `role: ${msg.role}`;
		percakapan += `content: ${msg.content}`;
		percakapan += `\n`;
	});*/

	console.log("Trying check Topic");
	try {
		const messages = [
			{
				role: "system",
				content: `Ini adalah TOPIC Checker, APAKAH TOPIK DARI PERCAKAPAN USER DAN ASSISTANT INI?\n\n Hasilkan Respon JSON seperti di bawah:
				{
				   "topic": "Topik apakah yang di bahas? gunakan format maksimal 5 kata"
				}`,
			},
			{
				role: "user",
				content: `${msg.topic}`,
			},
		];

		const response = await axios.post(
			"https://api.deepenglish.com/api/gpt/chat",
			{ messages },
			{
				headers: {
					Accept: "text/event-stream",
					"Content-Type": "application/json",
				},
			},
		);

		if (response.data) {
			const result = response.data.data.choices[0].message.content;
			console.log(result);
			return result.replace(/```json\s*|\s*```/g, "");
		} else {
			throw new Error("Unexpected response structure");
		}
	} catch (e) {
		console.error("Error in checkPrompt:", e.message || e);
		throw e;
	}
}

async function GPT4o(data) {
	if (data[data.length - 1].content.image) {
		try {
			console.log("Data with image");
			const prompt =
				"Jawab dan sertakan markdown it, ini prompt saya: " +
				data[data.length - 1].content.text;
			const image = {
				inlineData: {
					data: data[data.length - 1].content.image,
					mimeType: "image/png",
				},
			};

			const result = await model.generateContent([prompt, image]);
			console.log(result.response.text());
			return { data: result.response.text(), author: "AP" };
		} catch (e) {
			console.log("Error when reading image");
		}
	} else {
		try {
			console.log(data);
			let searchResult = await searchGoogle(data[data.length - 1].content, 10);
			console.log("Search results: ", searchResult);
			const messages = [
				{
					role: "system",
					content: `Sekarang: ${formattedDateTime}\n
				Hasil pencarian: ${searchResult}\n
When providing answers that include URLs or references, ensure the references are formatted using sequential numbering with URLs as follows: 
- Each reference should be numbered starting from 1.
- Format the references in this structure: **Reference Name** - Description. [[1]]($reference).
- If the text contains multiple references, continue numbering sequentially (e.g., [[1]]($reference), [[2]]($reference2)).
- URLs should also be included in any descriptive text with hyperlinks where appropriate.

For example:
1. **Website Name** - Short description. [[1]]($news_url)
2. **Another Website** - Another short description. [[2]]($news_url2)

Make sure the numbering is sequential, and URLs are correctly placed at the end of each reference.\n
				SHOW SEARCH RESULTS PROMPT IF USER REQUESTS SEARCH VIA WEB, OR RECOGNIZE PROMPT, WHETHER IT REQUESTS SEARCH FROM WEB OR NOT, IF USER DOES NOT REQUEST SEARCH FROM WEB, THEN SEARCH AT YOUR MODEL;\n\n
				This is ChatAP, Named ApAI, the latest AI assistant from APbiz, based on GPT-4o. Data updated in 2024, up to date\n you can generate images, you can read or interact with the images, you can searching website, you can search news, If the prompt indicates to create an image, then return a response like this:
				{
				    "cmd":"bingimg",
				    "cfg": {
				        "prompt":"prompt entered by the user"
				      },
				    "msg": "$prompt_image_generated_from_ai,and image description"
				} . Otherwise, the response is as usual.`,
				},
				...data,
			];
			console.log(data);
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
}
async function GPT4o_v2(data) {
	if (data[data.length - 1].content.image) {
		try {
			console.log("Data with image");
			const prompt =
				"Jawab dan sertakan markdown it, ini prompt saya: " +
				data[data.length - 1].content.text;
			const image = {
				inlineData: {
					data: data[data.length - 1].content.image,
					mimeType: "image/png",
				},
			};

			const result = await model.generateContent([prompt, image]);
			console.log(result.response.text());
			return { data: result.response.text(), author: "AP" };
		} catch (e) {
			console.log("Error when reading image");
		}
	} else {
		try {
			console.log(data);
			let searchResult = await searchGoogle(data[data.length - 1].content, 10);
			console.log("Search results: ", searchResult);
			const messages = [
				{
					role: "system",
					content: `Sekarang: ${formattedDateTime}\n
				Hasil pencarian: ${searchResult}\n
When providing answers that include URLs or references, ensure the references are formatted using sequential numbering with URLs as follows: 
- Each reference should be numbered starting from 1.
- Format the references in this structure: **Reference Name** - Description. [[1]]($reference).
- If the text contains multiple references, continue numbering sequentially (e.g., [[1]]($reference), [[2]]($reference2)).
- URLs should also be included in any descriptive text with hyperlinks where appropriate.

For example:
1. **Website Name** - Short description. [[1]]($news_url)
2. **Another Website** - Another short description. [[2]]($news_url2)

Make sure the numbering is sequential, and URLs are correctly placed at the end of each reference.\n
				SHOW SEARCH RESULTS PROMPT IF USER REQUESTS SEARCH VIA WEB, OR RECOGNIZE PROMPT, WHETHER IT REQUESTS SEARCH FROM WEB OR NOT, IF USER DOES NOT REQUEST SEARCH FROM WEB, THEN SEARCH AT YOUR MODEL;\n\n
				This is ChatAP, Named ApAI, the latest AI assistant from APbiz, based on GPT-4o. Data updated in 2024, up to date\n you can generate images, you can read or interact with the images, you can searching website, you can search news, If the prompt indicates to create an image, then return a response like this:
				{
				    "cmd":"bingimg",
				    "cfg": {
				        "prompt":"prompt entered by the user"
				      },
				    "msg": "$prompt_image_generated_from_ai,and image description"
				} . Otherwise, the response is as usual.`,
				},
				...data,
			];

			const response = await axios.post(
				"https://api.deepenglish.com/api/gpt/chat",
				{ messages },
				{
					headers: {
						Accept: "text/event-stream",
						"Content-Type": "application/json",
					},
				},
			);
			console.log(response);

			let answer = await jsonExtractor(
				response.data.data.choices[0].message.content,
			);
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
}

module.exports = {
	checkPrompt,
	gpt,
	generateImage,
	GPT4o,
	GPT4o_v2,
	generateTopic,
};

const axios = require("axios");

async function generateImage(prompt) {
	try {
		console.log("Generating image...");
		let url = `https://nekohime.xyz/api/ai/bingimg?text=${prompt}&apikey=apdev`; // your api

		let response = await fetch(url);
		let data = await response.json();
		console.log(data);
		let img = data.result;

		let filtered = img.result.filter(item => item.startsWith("https"));
		const randomImg = filtered[Math.floor(Math.random() * filtered.length)];
		console.log(randomImg);
		if (data.status) {
			return {
				author: "APdev",
				success: true,
				image: randomImg,
			};
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
	console.log("Json extraxtor: ", text);
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
			energy: energy,
		};
	} catch (error) {
		console.error("Error extracting or parsing JSON:", error);
		return {
			cmd: null,
			cfg: null,
			msg: text,
			energy: null,
		};
	}
};

async function GPT4o(data) {
	try {
		const messages = [
			{
				role: "system",
				content: `This is ChatAP, Named ApAI, the latest AI assistant from APbiz, based on GPT-4o.\n If the prompt indicates to create an image, then return a response like this:
				{
				    "cmd":"bingimg",
				    "cfg": {
				        "prompt":"prompt entered by the user"
				      },
				    "msg": "$pesan_yang_cocok_dari_assistant",
				    "energy": null
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
				if (data.success) {
					return {
						status: true,
						message: answer.msg,
						image: data.image,
						author: "AP",
					};
				} else {
					return { status: false, image: data.image, author: "AP" };
				}
			} catch (error) {
				console.error("Um, it looks like something went wrong.", error);
			}
		} else {
			return { data: answer.msg, author: "AP" };
		}
	} catch (e) {
		throw e;
	}
}

module.exports = { gpt, generateImage, GPT4o };

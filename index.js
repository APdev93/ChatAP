const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const socketIo = require("socket.io");
const ejs = require("ejs");
const http = require("http");

const bodyParser = require("body-parser");

const ai = require("./src/ai.js");

const port = 3000;
const isMaintenace = false;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const corsOptions = {
	origin: "https://ai.apdev.my.id",
	optionsSuccessStatus: 200,
};

app.use((req, res, next) => {
	const userAgent = req.headers["user-agent"];
	if (/curl|wget|PostmanRuntime|Scrapy/.test(userAgent)) {
		return res.status(403).json({ error: "Forbidden" });
	}
	next();
});

app.use(cors(corsOptions));

// Middleware untuk file statis
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	if (!isMaintenace) {
		res.render("index");
	} else {
		res.render("maintenance");
	}
});

app.post("/check_prompt", async (req, res) => {
	try {
		const { prompt } = req.body;

		if (typeof prompt !== "string" || prompt.trim() === "") {
			return res.status(400).json({ error: "Invalid prompt data", cmd: null });
		}

		const checkedData = await ai.checkPrompt(prompt);
		if (checkedData) {
			res.status(200).json({ cmd: checkedData.cmd });
		} else {
			res.status(500).json({ error: "Failed to process prompt", cmd: null });
		}
	} catch (error) {
		console.error("Error processing /check_prompt:", error);
		res.status(500).json({ error: "Internal server error", cmd: null });
	}
});

app.post("/completion", async (req, res) => {
	const clientIp =
		req.headers["x-forwarded-for"] || req.connection.remoteAddress;
	if (!isMaintenace) {
		let content = req.body.messages;
		let model = req.body.model;
		if (model == "gpt") {
			let data = await ai.gpt(content);
			if (req) {
				console.log(`new request. model: ${model}`);
			}
			if (data) {
				res.json(data);
			} else {
				res.json({
					author: "APdev",
					success: false,
					data: "Something error. Contact owner",
				});
			}
		} else if (model == "gpt4o") {
			let data = await ai.GPT4o(content);
			if (req) {
				console.log(`new request. model: ${model}`);
			}
			if (data) {
				res.json(data);
			} else {
				res.json({
					author: "APdev",
					success: false,
					data: "Something error. Contact owner",
				});
			}
		}
	} else {
		res.status(503).send({
			messages: "You cannot access this endpoint",
		});
	}
});
app.post("/imagining", async (req, res) => {
	const prompt = req.body.prompt;
	if (prompt) {
		console.log("image generation: ", prompt);
		let data = await ai.generateImage(prompt);
		console.log(data);
		if (data) {
			res.status(200).json(data);
		}
	}
});
app.get("/download", async (req, res) => {
	let imageUrl = req.query.url;

	try {
		const response = await axios.get(imageUrl, { responseType: "stream" });

		res.setHeader("Content-Type", "image/jpeg");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=AP-${new Date().getTime()}.jpg`,
		);

		response.data.pipe(res);
	} catch (error) {
		console.error("Failed to download image:", error);
		res.status(500).send("Failed to download image");
	}
});

var currentRoute = {
	response: "a",
	message: "b",
};

const generateRandomRoute = () => {
	let r = "";
	const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
	for (let i = 0; i < 5; i++) {
		r += c.charAt(Math.floor(Math.random() * c.length));
	}
	return r;
};

const createNewRoute = () => {
	let a = generateRandomRoute();
	let b = generateRandomRoute();
	currentRoute.response = a;
	currentRoute.message = b;
};

app.post("/callback", (req, res) => {
	if (req.body) {
		console.log("Received callback");

		res.status(200).json({
			rec: currentRoute.response,
			snd: currentRoute.message,
		});
		console.log("Generated routes:", currentRoute);
	} else {
		res.status(500).json({ msg: "Callback not successful" });
	}
});

io.on("connection", sock => {
	const clientIp = sock.handshake.address;
	console.log(`[SOCKET] : ${clientIp} connected`);

	const uniqueRoom = `room_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 15)}`;
	sock.join(uniqueRoom);

	console.log(`Listening for chat on route: ${currentRoute.message}`);
	console.log(`Will respond on route: ${currentRoute.response}`);

	sock.on(`chat ${currentRoute.message}`, async message => {
		console.log("Received message:", message);
		const lastMessage = message.last.filter(msg => msg.role !== "images");
		console.log(message);
		try {
			const json = {
				model: "gpt4o",
				messages: [
					...lastMessage,
					{
						role: "user",
						content: message.coming.content,
					},
				],
			};

			const response = await fetch(`http://localhost:${port}/completion`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(json),
			});

			const responseData = await response.json();

			if (responseData.image) {
				let newImageMessage = {
					role: "images",
					content: responseData.image,
				};
				io.to(uniqueRoom).emit(`chat ${currentRoute.response}`, newImageMessage);
				let captionImage = {
					role: "assistant",
					content: responseData.message,
				};
				io.to(uniqueRoom).emit(`chat ${currentRoute.response}`, captionImage);
			} else {
				const assistantResponse = responseData.data;
				const newMessage = {
					role: "assistant",
					content: assistantResponse,
				};
				io.to(uniqueRoom).emit(`chat ${currentRoute.response}`, newMessage);
			}

			console.log(`Message emitted to chat ${currentRoute.response}`);
		} catch (error) {
			console.log("Error sending message to API:", error);
		}
	});

	sock.on("disconnect", () => {
		createNewRoute();
		console.log(`[SOCKET] : ${clientIp} disconnected`);
	});
});

server.listen(port, () => {
	console.log("[SERVER] : Server running, on port: ", port);
});
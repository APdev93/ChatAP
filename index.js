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

app.post("/callback", (req, res) => {
	if (req.body) {
		console.log("Received callback: ", req.body);
		res.status(200).json({ message: req.body });
	} else {
		res.status(404).json({ message: false });
	}
});

io.on("connection", sock => {
	const clientIp = sock.handshake.address;
	console.log(`[SOCKET] : ${clientIp} connected`);
	sock.on("disconnect", () => {
		console.log(`[SOCKET] : ${clientIp} disconnected`);
	});

	sock.on("chat message", async message => {
		console.log("Not filtered: ", message.last);
		let lastMessage = message.last.filter(msg => msg.role !== "images");
		console.log("Filtered array: ", lastMessage);
		try {
			const json = {
				model: "gpt4o",
				messages: [
					...lastMessage,
					{
						role: "user",
						content: message.comming.content,
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
				if (responseData.status) {
					const newAMessage = {
						role: "assistant",
						content: responseData.message,
					};
					sock.emit("chat response", newAMessage);
				}
				const newMessage = {
					role: "images",
					content: responseData.image,
				};
				sock.emit("chat response", newMessage);
			} else {
				const assistantResponse = responseData.data;
				const newMessage = {
					role: "assistant",
					content: assistantResponse,
				};

				sock.emit("chat response", newMessage);
			}
		} catch (error) {
			console.log("Error sending message to API:", error);
		}
	});
});
/* io.on("connection", sock => {
	const clientIp = sock.handshake.address;
	console.log(`[SOCKET] : ${clientIp} connected`);
	sock.on("disconnect", () => {
		console.log(`[SOCKET] : ${clientIp} disconnected`);
	});

	sock.on("chat message", async message => {
		const regex = /(gambarkan|imagine|picture)/i;
		console.log(message);
		if (regex.test(message.comming.content)) {
			try {
				const response = await fetch(`http://localhost:${port}/imagining`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ prompt: message.comming.content }),
				});

				const data = await response.json();
				const newMessage = {
					role: "images",
					content: data.image,
				};
				sock.emit("chat response", newMessage);
			} catch (error) {
				console.error("Error posting image:", error);
			}
		} else {
			//allmsg.push(message);
			try {
				const json = {
					model: "gpt",
					messages: [
						...message.last,
						{
							role: "user",
							content: message.comming.content,
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
				const assistantResponse = responseData.data;
				const newMessage = {
					role: "assistant",
					content: assistantResponse,
				};

				sock.emit("chat response", newMessage);
			} catch (error) {
				console.log("Error sending message to API:", error);
			}
		}
	});
}); */

server.listen(port, () => {
	console.log("[SERVER] : Server running, on port: ", port);
});

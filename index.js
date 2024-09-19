require("./config.js");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const socketIo = require("socket.io");
const ejs = require("ejs");
const http = require("http");
const pako = require("pako");
const session = require("express-session");
const fs = require("fs");

const bodyParser = require("body-parser");

const ai = require("./src/ai.js");
const db = require("./src/database.js");
const { syncDb, syncPath } = require("./utils/database.js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ limit: "20mb", extended: true }));

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

app.use(
	session({
		secret: "chatap",
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 30 * 24 * 60 * 60 * 1000,
		},
	}),
);

function isAuth(req, res, next) {
	if (req.session && req.session.user) {
		return next();
	}
	res.redirect("/login");
}

let otps = {};

const generateId = length => {
	let r = "";
	const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
	for (let i = 0; i < length; i++) {
		r += c.charAt(Math.floor(Math.random() * c.length));
	}
	return r;
};
const generateChatId = length => {
	let r = "";
	const c = "abcdefghijklmnopqrstuvwxyz0123456789-";
	for (let i = 0; i < length; i++) {
		r += c.charAt(Math.floor(Math.random() * c.length));
	}
	return r;
};

const sendOTP = async (number, otp) => {
	const url = "https://apbiz.xyz/api/wa/v1/message/send";
	let text;
	let footer;
	if (!number.startsWith("62")) {
		text = `${otp} is the verification code.
For safety reasons, don't
share this code.`;
		footer = "This code expires in 5 minutes";
	} else {
		text = `${otp} adalah code verifikasi
Anda. Demi kemanan, jangan
bagikan kode ini.`;
		footer = "Kode ini kadaluarsa dalam 5 menit";
	}
	const data = {
		session: "AQWeqEqx",
		token: "apbiz.AQWeqEqx",
		to: number,
		type: "interactive",
		content: {
			text: text,
			footer: footer,
			templateButtons: [
				{
					copyButton: {
						displayText: "Salin OTP",
						id: generateId(32),
						code: otp,
					},
				},
			],
		},
	};

	try {
		let response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		let result = await response.json();
		if (result.status === 200) {
			return true;
		} else {
			return false;
		}
	} catch (e) {
		console.log("Error went sending otp to: ", number);
		return false;
	}
};

// Middleware untuk file statis
app.use(express.static(path.join(__dirname, "public")));

app.get("/", isAuth, async (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");
	console.log(req.session.user);
	let user = req.session.user.username;
	let chatsData = await db.readChatsData(user);
	res.render("index", {
		username: req.session.user.username,
		isNewChat: true,
		chatId: generateChatId(35),
		history: chatsData,
	});
});

app.get("/chat/:chat_id", isAuth, async (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");

	let chatId = req.params.chat_id;
	let user = req.session.user.username;
	let chatsData = await db.readChatsData(user);

	res.render("index", {
		username: req.session.user.username,
		isNewChat: false,
		chatId: chatId,
		lastMessage: chatsData[chatId].chat,
		history: chatsData,
	});
});

app.post("/add_history", async (req, res) => {
	let { chat_id, data } = req.body;
	let user = req.session.user.username;
	let dataPath = `./db/${user}/chat_session.json`;
	console.log(req.body);
	try {
		let chatData = await db.readChatsData(user);
		let newData;
		console.log("LastChatToAdded: ", data);
		if (data.role === "user" || data.role === "assistant") {
			newData = {
				role: data.role,
				content: data.content,
			};
		}

		if (chatData[chat_id]) {
			chatData[chat_id].chat.push(newData);

			await fs.writeFileSync(dataPath, JSON.stringify(chatData, null, 3));
			res.status(200).json({
				status: true,
				msg: "Last message successfully added",
				data: chatData[chat_id].chat,
			});

			console.log("new Msg has added: ", chatData[chat_id].chat);
		}
	} catch (e) {
		console.log(e);
		res.status(200).json({
			status: false,
			msg: "error from server",
			data: [],
		});
	}
});

app.post("/get_last_message", async (req, res) => {
	let { chat_id } = req.body;
	let user = req.session.user.username;
	let dataPath = `./db/${user}/chat_session.json`;
	try {
		let chatData = await db.readChatsData(user);
		if (chatData[chat_id]) {
			res.status(200).json({
				status: true,
				data: chatData[chat_id].chat,
			});
			console.log(chatData[chat_id].chat);
		} else {
			res.status(200).json({
				status: true,
				data: [],
			});
		}
	} catch (e) {
		console.log(e);
		res.status(200).json({
			status: false,
			msg: "error from server",
			data: [],
		});
	}
});

app.post("/get_chat_info", async (req, res) => {
	let { chat_id } = req.body;
	let user = req.session.user.username;
	let dataPath = `./db/${user}/chat_session.json`;
	try {
		console.log(req.body);
		let chatsData = await db.readChatsData(user);

		if (!chatsData[chat_id]) {
			let newChats = {
				id: chat_id,
				chat_title: "new chat",
				timestamp: Date.now(),
				chat: [],
			};
			chatsData[chat_id] = newChats;
			await fs.writeFileSync(dataPath, JSON.stringify(chatsData, null, 3));
			res.status(200).json({
				status: true,
				newChat: true,
				chat: chatsData[chat_id],
			});
		} else {
			res.status(200).json({
				status: true,
				newChat: false,
				chat: chatsData[chat_id],
			});
		}
	} catch (e) {
		console.log(e);
		res.status(200).json({
			status: false,
			msg: "error from server",
			newChat: false,
			chat: null,
		});
	}
});

app.get("/register", (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");
	res.render("register");
});

app.get("/login", (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");
	res.render("login");
});

app.get("/verify", (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");
	res.render("verify");
});

app.post("/login", async (req, res) => {
	let { whatsapp } = req.body;

	if (whatsapp) {
		let found = await db.login(req, res);
		if (found) {
			const userData = await db.readAllUser();
			const user = userData[whatsapp];
			req.session.user = user;
			res.status(200).json({
				status: true,
				msg: "Login berhasil",
			});
		} else {
			res.status(404).json({
				status: false,
				msg: "Akun tidak di temukan",
			});
		}
	} else {
		res.status(404).json({
			status: false,
			msg: "Whatsapp dibutuhkan",
		});
	}
});

app.post("/register", async (req, res) => {
	let { username, whatsapp, password } = req.body;
	const otp = Math.floor(100000 + Math.random() * 900000).toString();

	otps[whatsapp] = otp;

	try {
		console.log(req.body);
		let isOtpSend = await sendOTP(whatsapp, otp);

		if (isOtpSend) {
			res.render("verify", { username, whatsapp, password });
		} else {
			console.log("Cannot send otp to: ", whatsapp);
		}
	} catch (e) {
		console.log("error went register: ", e);
	}
});

app.post("/verify", async (req, res) => {
	let { username, whatsapp, password, otp } = req.body;

	if (otps[whatsapp] === otp) {
		const newUser = {
			whatsapp: whatsapp,
			username: username,
			password: password,
			userid: generateId(8),
		};

		let createdUser = await db.createUser(newUser);
		console.log(createdUser);
		if (createdUser.status) {
			res.status(200).json(createdUser);
		} else {
			res.status(500).json(createdUser);
		}
	} else {
		res.status(404).json({ status: false, msg: "Otp Tidak Valid" });
	}
});

app.post("/check_prompt", async (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");
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
	if (isMaintenace) return res.status(503).render("maintenance");
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
	if (isMaintenace) return res.status(503).render("maintenance");
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
	if (isMaintenace) return res.status(503).render("maintenance");
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

app.post("/callback", async (req, res) => {
	if (isMaintenace) return res.status(503).render("maintenance");

	if (req.body) {
		console.log("Received callback");
		console.log(req.body);

		// ? Cek ada body msg ga
		if (!req.body.msg.msg)
			return res.status(500).json({ msg: "Error From Server" });

		// ? Cek ada act header ga
		if (!req.headers["x-action"])
			return res.status(500).json({ msg: "Error From Server" });
		const act = req.headers["x-action"];
		const msg = req.body?.msg?.msg || "";
		/* console.log(`Action : ${act}`); */
		/* console.log(`Message : ${Buffer.from(msg, "base64").toString("utf-8")}`); */

		// ? Kalo act revalidate
		if (act === "revalidate") {
			// ? Cek kalo msg itu sama ga
			if (
				Buffer.from(msg, "base64").toString("utf-8") !==
				"Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio=="
			)
				return res.status(500).json({
					msg: "Error From Server",
				});

			res.status(200).json({
				rec: currentRoute.response,
				snd: currentRoute.message,
			});
		} else {
			// ? Cek key buat descrypt uuid base64
			const key = req.headers["x-id"] || "";
			if (!key)
				return res.status(500).json({
					msg: "Error From Server",
				});

			// ? Cek bener ga uuidnya 5 kalo displit -
			if (
				Buffer.from(msg, "base64")
					.toString("utf-8")
					.replace(new RegExp(key, "gi"), "-")
					.split("-").length !== 5
			)
				return res.status(500).json({
					msg: "Error From Server",
				});

			res.status(200).json({
				rec: currentRoute.response,
				snd: currentRoute.message,
			});
		}
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

	console.log(`UniqueRoom : ${uniqueRoom}`);
	console.log(`Listening for chat on route: ${currentRoute.message}`);
	console.log(`Will respond on route: ${currentRoute.response}`);

	sock.on(`chat ${currentRoute.message}`, async message => {
		console.log("Received message:", message);
		if (message.coming.content.image) {
			const decompressedImage = pako.inflate(message.coming.content.image, {
				to: "string",
			});
			message = {
				coming: {
					role: "user",
					content: {
						image: decompressedImage,
						text: message.coming.content.text,
					},
				},
				last: message.last.map(item => {
					if (typeof item.content === "object") {
						return {
							role: item.role,
							content: item.content.text || null,
						};
					}
					return item;
				}),
				sessionHash: message.sessionHash,
			};
		} else {
			message = {
				coming: {
					role: "user",
					content: message.coming.content,
				},
				last: message.last.map(item => {
					if (typeof item.content === "object") {
						return {
							role: item.role,
							content: item.content.text || null,
						};
					}
					return item;
				}),
				sessionHash: message.sessionHash,
			};
		}

		const lastMessage = message.last.filter(msg => msg.role !== "images");

		// ? Cek misal sessionHash itu ga sama kyk current route trus ngeemit error
		if (
			Buffer.from(message.sessionHash, "base64").toString("utf-8") !==
			currentRoute.message
		)
			return io
				.to(uniqueRoom)
				.emit(`chat ${currentRoute.response}`, { error: "Forbidden" });
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

			// ? Check ai
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

app.use((req, res) => {
	res.status(404).render("404", {
		page: req.originalUrl,
	});
});

const startServer = async () => {
	await syncDb();
	await syncPath("./db/");
	server.listen(port, () => {
		console.log("[SERVER] : Server running, on port: ", port);
	});
};

startServer();

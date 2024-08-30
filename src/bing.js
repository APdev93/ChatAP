const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const crypto = require("node:crypto");
const WebSocket = require("ws");

const BING_URL = process.env.BING_URL || "https://www.bing.com";
const randomIPComponent = () => Math.floor(Math.random() * 256);
const FORWARDED_IP = `13.${randomIPComponent()}.${randomIPComponent()}.${randomIPComponent()}`;
const HEADERS = {
	accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"accept-language": "en-US,en;q=0.9",
	"cache-control": "max-age=0",
	"content-type": "application/x-www-form-urlencoded",
	referrer: "https://www.bing.com/images/create/",
	origin: "https://www.bing.com",
	"user-agent":
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63",
	"x-forwarded-for": FORWARDED_IP,
};

const error_timeout = "Your request has timed out.";
const error_redirect = "Redirect failed";
const error_blocked_prompt =
	"Your prompt has been blocked by Bing. Try to change any bad words and try again.";
const error_being_reviewed_prompt =
	"Your prompt is being reviewed by Bing. Try to change any sensitive words and try again.";
const error_noresults = "Could not get results";
const error_unsupported_lang =
	"\nthis language is currently not supported by bing";
const error_bad_images = "Bad images";
const error_no_images = "No images";
const sending_message = "Sending request...";
const wait_message = "Waiting for results...";
const download_message = "\nDownloading images...";

class ImageGen {
	constructor(
		auth_cookie,
		auth_cookie_SRCHHPGUSR,
		debug_file = null,
		quiet = false,
		all_cookies = null,
	) {
		this.auth_cookie = auth_cookie;
		this.auth_cookie_SRCHHPGUSR = auth_cookie_SRCHHPGUSR;
		this.session = axios.create({
			headers: HEADERS,
			maxRedirects: 0,
		});
		this.session.defaults.maxRedirects = 0;
		this.session.defaults.validateStatus = status =>
			status === 302 || (status >= 200 && status < 300);
		this.session.defaults.withCredentials = true;
		this.session.defaults.transformResponse = [data => data];
		this.session.defaults.validateStatus = null;
		this.session.defaults.responseEncoding = "utf8";
		this.session.defaults.responseType = "text";
		this.session.defaults.validateStatus = null;
		this.session.defaults.timeout = 5000;
		this.session.defaults.headers.common[
			"Cookie"
		] = `_U=${auth_cookie}; SRCHHPGUSR=${auth_cookie_SRCHHPGUSR}`;
		if (all_cookies) {
			for (const cookie of all_cookies) {
				this.session.defaults.headers.common[
					"Cookie"
				] += `; ${cookie.name}=${cookie.value}`;
			}
		}
		this.quiet = quiet;
		this.debug_file = debug_file;
		if (this.debug_file) {
			this.debug = text_var => {
				fs.appendFileSync(this.debug_file, `${text_var}\n`, "utf-8");
			};
		}
	}

	async get_images(prompt) {
		if (!this.quiet) {
			console.log(sending_message);
		}
		if (this.debug_file) {
			this.debug(sending_message);
		}
		const url_encoded_prompt = encodeURIComponent(prompt);
		const payload = `q=${url_encoded_prompt}&qs=ds`;
		let url = `${BING_URL}/images/create?q=${url_encoded_prompt}&rt=4&FORM=GENCRE`;
		let response;
		try {
			response = await this.session.post(url, payload);
		} catch (error) {
			console.error(error);
		}
		if (response.data.toLowerCase().includes("this prompt is being reviewed")) {
			if (this.debug_file) {
				this.debug(`ERROR: ${error_being_reviewed_prompt}`);
			}
			throw new Error(error_being_reviewed_prompt);
		}
		if (response.data.toLowerCase().includes("this prompt has been blocked")) {
			if (this.debug_file) {
				this.debug(`ERROR: ${error_blocked_prompt}`);
			}
			throw new Error(error_blocked_prompt);
		}
		if (
			response.data
				.toLowerCase()
				.includes("we're working hard to offer image creator in more languages")
		) {
			if (this.debug_file) {
				this.debug(`ERROR: ${error_unsupported_lang}`);
			}
			throw new Error(error_unsupported_lang);
		}
		if (response.status !== 302) {
			url = `${BING_URL}/images/create?q=${url_encoded_prompt}&rt=3&FORM=GENCRE`;
			try {
				response = await this.session.post(url, payload);
			} catch (error) {
				console.error(error);
			}
			if (response.status !== 302) {
				if (this.debug_file) {
					this.debug(`ERROR: ${error_redirect}`);
				}
				console.log(`ERROR: ${response.data}`);
				throw new Error(error_redirect);
			}
		}
		const redirect_url = response.headers["location"].replace("&nfy=1", "");
		const request_id = redirect_url.split("id=")[1];
		await this.session.get(`${BING_URL}${redirect_url}`);
		const polling_url = `${BING_URL}/images/create/async/results/${request_id}?q=${url_encoded_prompt}`;
		if (this.debug_file) {
			this.debug("Polling and waiting for result");
		}
		if (!this.quiet) {
			process.stdout.write(wait_message);
		}
		const start_wait = Date.now();
		while (true) {
			if (Date.now() - start_wait > 360000) {
				if (this.debug_file) {
					this.debug(`ERROR: ${error_timeout}`);
				}
				throw new Error(error_timeout);
			}
			if (!this.quiet) {
				process.stdout.write(".");
			}
			try {
				response = await this.session.get(polling_url);
			} catch (error) {
				console.error(error);
			}
			if (response.status !== 200) {
				if (this.debug_file) {
					this.debug(`ERROR: ${error_noresults}`);
				}
				throw new Error(error_noresults);
			}
			if (!response.data || response.data.includes("errorMessage")) {
				await sleep(1000);
			} else {
				if (this.debug_file) {
					this.debug("done");
				}
				console.log("\ndone");
				break;
			}
		}
		const image_links = response.data
			.match(/src="([^"]+)"/g)
			.map(match => match.match(/src="([^"]+)"/)[1]);
		const normal_image_links = image_links.map(link => link.split("?w=")[0]);
		const unique_image_links = [...new Set(normal_image_links)];
		const bad_images = [
			"https://r.bing.com/rp/in-2zU3AJUdkgFe7ZKv19yPBHVs.png",
			"https://r.bing.com/rp/TX9QuO3WzcCJz1uaaSwQAz39Kb0.jpg",
		];
		for (const img of unique_image_links) {
			if (bad_images.includes(img)) {
				throw new Error(error_bad_images);
			}
		}
		if (unique_image_links.length === 0) {
			throw new Error(error_no_images);
		}
		return unique_image_links;
	}

	async save_images(links, output_dir, file_name = null, download_count = null) {
		if (this.debug_file) {
			this.debug(download_message);
		}
		if (!this.quiet) {
			console.log(download_message);
		}
		if (!fs.existsSync(output_dir)) {
			fs.mkdirSync(output_dir, { recursive: true });
		}
		let fn = file_name ? `${file_name}_` : "";
		let jpeg_index = 0;
		if (download_count) {
			links = links.slice(0, download_count);
		}
		for (const link of links) {
			while (fs.existsSync(path.join(output_dir, `${fn}${jpeg_index}.jpeg`))) {
				jpeg_index++;
			}
			let response;
			try {
				response = await this.session.get(link, {
					responseType: "arraybuffer",
				});
			} catch (error) {
				console.error(error);
			}
			if (response.status !== 200) {
				throw new Error("Could not download image");
			}
			fs.writeFileSync(
				path.join(output_dir, `${fn}${jpeg_index}.jpeg`),
				response.data,
			);
			jpeg_index++;
		}
	}
}

// src/fetch.ts
var fetch = globalThis.fetch;
if (typeof fetch !== "function") {
	throw new Error("Invalid environment: global fetch not defined");
}

// src/bing-chat.ts
var terminalChar = "";
var BingChat = class {
	constructor(opts) {
		const { cookie, debug = false } = opts;
		this._cookie = cookie;
		this._debug = !!debug;
		if (!this._cookie) {
			throw new Error("Bing cookie is required");
		}
	}
	/**
	 * Sends a message to Bing Chat, waits for the response to resolve, and returns
	 * the response.
	 *
	 * If you want to receive a stream of partial responses, use `opts.onProgress`.
	 *
	 * @param message - The prompt message to send
	 * @param opts.conversationId - Optional ID of a conversation to continue (defaults to a random UUID)
	 * @param opts.onProgress - Optional callback which will be invoked every time the partial response is updated
	 *
	 * @returns The response from Bing Chat
	 */
	async sendMessage(text, opts = {}) {
		const {
			invocationId = "1",
			onProgress,
			locale = "en-US",
			market = "en-US",
			region = "US",
			location,
			messageType = "Chat",
			variant = "Balanced",
		} = opts;
		let { conversationId, clientId, conversationSignature } = opts;
		const isStartOfSession = !(
			conversationId &&
			clientId &&
			conversationSignature
		);
		if (isStartOfSession) {
			const conversation = await this.createConversation();
			conversationId = conversation.conversationId;
			clientId = conversation.clientId;
			conversationSignature = conversation.conversationSignature;
		}
		const result = {
			author: "bot",
			id: crypto.randomUUID(),
			conversationId,
			clientId,
			conversationSignature,
			invocationId: `${parseInt(invocationId, 10) + 1}`,
			text: "",
		};
		const responseP = new Promise(async (resolve, reject) => {
			const chatWebsocketUrl = `wss://sydney.bing.com/sydney/ChatHub?sec_access_token=${encodeURIComponent(
				conversationSignature,
			)}`;
			const ws = new WebSocket(chatWebsocketUrl, {
				perMessageDeflate: false,
				headers: {
					"accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
					"cache-control": "no-cache",
					pragma: "no-cache",
				},
			});
			let isFulfilled = false;
			function cleanup() {
				ws.close();
				ws.removeAllListeners();
			}
			ws.on("error", error => {
				console.warn("WebSocket error:", error);
				cleanup();
				if (!isFulfilled) {
					isFulfilled = true;
					reject(new Error(`WebSocket error: ${error.toString()}`));
				}
			});
			ws.on("close", () => {});
			ws.on("open", () => {
				ws.send(`{"protocol":"json","version":1}${terminalChar}`);
			});
			let stage = 0;
			ws.on("message", data => {
				var _a, _b;
				const objects = data.toString().split(terminalChar);
				const messages = objects
					.map(object => {
						try {
							return JSON.parse(object);
						} catch (error) {
							return object;
						}
					})
					.filter(Boolean);
				if (!messages.length) {
					return;
				}
				if (stage === 0) {
					ws.send(`{"type":6}${terminalChar}`);
					const traceId = crypto.randomBytes(16).toString("hex");
					const locationStr = location
						? `lat:${location.lat};long:${location.lng};re=${location.re || "1000m"};`
						: void 0;
					const optionsSets = [
						"nlu_direct_response_filter",
						"deepleo",
						"enable_debug_commands",
						"disable_emoji_spoken_text",
						"responsible_ai_policy_235",
						"enablemm",
						"trffovrd",
						"h3toppfp3",
						"forcerep",
						"cpcttl1d",
						"dv3sugg",
					];
					if (variant == "Balanced") {
						optionsSets.push("galileo");
					} else if (variant == "Creative") {
						optionsSets.push("h3imaginative");
						optionsSets.push("gencontentv3");
					} else if (variant == "Precise") {
						optionsSets.push("h3precise");
					}
					console.log(variant);
					const params = {
						arguments: [
							{
								source: "cib",
								optionsSets,
								allowedMessageTypes: [
									"Chat",
									"InternalSearchQuery",
									"InternalSearchResult",
									"InternalLoaderMessage",
									"RenderCardRequest",
									"AdsQuery",
									"SemanticSerp",
								],
								sliceIds: [],
								traceId,
								isStartOfSession,
								message: {
									locale,
									market,
									region,
									location: locationStr,
									author: "user",
									inputMethod: "Keyboard",
									messageType,
									text,
								},
								participant: { id: clientId },
								conversationId,
							},
						],
						invocationId,
						target: "chat",
						type: 4,
					};
					if (this._debug) {
						console.log(chatWebsocketUrl, JSON.stringify(params, null, 2));
					}
					ws.send(`${JSON.stringify(params)}${terminalChar}`);
					++stage;
					return;
				}
				for (const message of messages) {
					if (message.type === 1) {
						const update = message;
						const msg = (_a = update.arguments[0].messages) == null ? void 0 : _a[0];
						if (!msg) continue;
						if (!msg.messageType) {
							result.author = msg.author;
							result.text = msg.text;
							result.detail = msg;
							onProgress == null ? void 0 : onProgress(result);
						}
					} else if (message.type === 2) {
						const response = message;
						if (this._debug) {
							console.log("RESPONSE", JSON.stringify(response, null, 2));
						}
						const validMessages =
							(_b = response.item.messages) == null
								? void 0
								: _b.filter(m => !m.messageType);
						const lastMessage =
							validMessages == null
								? void 0
								: validMessages[
										(validMessages == null ? void 0 : validMessages.length) - 1
								  ];
						if (lastMessage) {
							result.conversationId = response.item.conversationId;
							result.conversationExpiryTime = response.item.conversationExpiryTime;
							result.author = lastMessage.author;
							result.text = lastMessage.text;
							result.detail = lastMessage;
							if (!isFulfilled) {
								isFulfilled = true;
								resolve(result);
							}
						}
					} else if (message.type === 3) {
						if (!isFulfilled) {
							isFulfilled = true;
							resolve(result);
						}
						cleanup();
						return;
					} else {
					}
				}
			});
		});
		return responseP;
	}
	async createConversation() {
		const requestId = crypto.randomUUID();
		const cookie =
			(this._cookie.includes(";") ? this._cookie : `_U=${this._cookie}`) +
			`;SRCHHPGUSR=HV=${Math.round(/* @__PURE__ */ new Date().getTime() / 1e3)}`;
		return fetch("https://www.bing.com/turing/conversation/create", {
			headers: {
				accept: "application/json",
				"accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
				"content-type": "application/json",
				"sec-ch-ua":
					'"Not_A Brand";v="99", "Microsoft Edge";v="109", "Chromium";v="109"',
				"sec-ch-ua-arch": '"x86"',
				"sec-ch-ua-bitness": '"64"',
				"sec-ch-ua-full-version": '"109.0.1518.78"',
				"sec-ch-ua-full-version-list":
					'"Not_A Brand";v="99.0.0.0", "Microsoft Edge";v="109.0.1518.78", "Chromium";v="109.0.5414.120"',
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-model": "",
				"sec-ch-ua-platform": '"macOS"',
				"sec-ch-ua-platform-version": '"12.6.0"',
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				"x-edge-shopping-flag": "1",
				"x-ms-client-request-id": requestId,
				"x-ms-useragent":
					"azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.10.0 OS/MacIntel",
				"x-forwarded-for": "1.1.1.1",
				cookie,
			},
			referrer: "https://www.bing.com/search",
			referrerPolicy: "origin-when-cross-origin",
			body: null,
			method: "GET",
			mode: "cors",
			credentials: "include",
		}).then(res => {
			if (res.ok) {
				const conversationSignature =
					res.headers.get("x-sydney-encryptedconversationsignature") ?? "";
				return res.json().then(res2 => {
					return {
						...res2,
						conversationSignature,
					};
				});
			} else {
				throw new Error(
					`unexpected HTTP error createConversation ${res.status}: ${res.statusText}`,
				);
			}
		});
	}
};

const bing = async (query, model, cookie) => {
	return new Promise(async (resolve, reject) => {
		try {
			const api = new BingChat({
				cookie: cookie,
			});
			const res = await api.sendMessage(query, {
				variant: model,
			});
			resolve(res);
		} catch (error) {
			reject(error);
		}
	});
};

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())];
}
module.exports = { ImageGen, BingChat };


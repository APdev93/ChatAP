(function () {
	const chatContainer = document.getElementById("chat-container");
	const socket = io();
	let messages = [];

	let copyCount = 0;

	function copyCode(e) {
		const t = document.getElementById(e).innerText;
		window.alert("Copied ✓"), navigator.clipboard.writeText(t);
	}

	setInterval(() => {
		const copy = document.getElementsByClassName("copyBtn");
		if (copyCount < copy.length) {
			for (let cop of copy) {
				const p = cop.cloneNode(true);
				const n = cop.getAttribute("data-id");
				console.log(n);
				p.addEventListener("click", () => {
					copyCode(n);
				});
				cop.parentNode.replaceChild(p, cop);
			}

			copyCount++;
		}
	}, 2500);

	document
		.getElementById("message-form")
		.addEventListener("submit", async function (event) {
			event.preventDefault();
			window.location.href = "#chat";

			const textarea = document.getElementById("message"); // pastikan textarea sudah didefinisikan
			textarea.style.height = "45px";

			const inputMessage = textarea.value;
			const imageInput = document.getElementById("imageInput").files[0]; // Mengambil file input, bukan value
			const currentTime = new Date().toLocaleTimeString();
			let btnSend = document.getElementById("btnSend");
			let newMessage;

			if (imageInput) {
				const reader = new FileReader();
				reader.onloadend = async function () {
					const base64String = reader.result
						.replace("data:", "")
						.replace(/^.+,/, "");

					newMessage = {
						role: "user",
						content: {
							image: base64String,
							text: inputMessage,
						},
					};

					messages.push(newMessage);
					renderMessages(messages);
					textarea.value = "";
					document.getElementById("imageInput").value = "";
					btnSend.innerHTML = `<span class="loading"></span>`;
					btnSend.setAttribute("disabled", "true");
					await sendMessage(inputMessage, newMessage);
				};
				reader.readAsDataURL(imageInput);
			} else {
				newMessage = {
					role: "user",
					content: inputMessage,
				};

				messages.push(newMessage);
				renderMessages(messages);
				textarea.value = "";
				document.getElementById("imageInput").value = "";
				btnSend.innerHTML = `<span class="loading"></span>`;
				btnSend.setAttribute("disabled", "true");
				await sendMessage(inputMessage, newMessage);
			}
		});
	const applyPreferredTheme = () => {
		const prefersDarkScheme = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		if (prefersDarkScheme) {
			document.documentElement.setAttribute("data-theme", "dark");
		} else {
			document.documentElement.removeAttribute("data-theme");
		}
	};

	applyPreferredTheme();
	const textarea = document.getElementById("message");
	var originalHeight = textarea.style.height;

	textarea.addEventListener("input", function () {
		if (this.value.includes("\n")) {
			this.style.borderRadius = "25px";
		} else {
			this.style.borderRadius = "50px";
		}
		if (this.value === "") {
			this.style.height = originalHeight;
		} else {
			this.style.height = "auto";
			this.style.height = "45px";
			this.style.height = this.scrollHeight + "px";
		}
	});

	const generateId = () => {
		let r = "";
		const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
		for (let i = 0; i < 10; i++) {
			r += c.charAt(Math.floor(Math.random() * c.length));
		}
		return r;
	};

	const md = window.markdownit({
		highlight: function (str, lang) {
			let codeId = generateId();
			if (lang && window.hljs.getLanguage(lang)) {
				try {
					return `<div class="codehead">
	<p>${lang || "plaintext"}</p>
	<button onclick="copyCode('${codeId}')"><i class="fa-regular fa-copy"></i> salin</button>
</div>
<pre class="hljs">
     <code id="${codeId}">${window.hljs.highlight(lang, str, true).value}</code>
</pre>`;
				} catch (__) {}
			}
			return `<div class="codehead">
	<p></p>
	<button onclick="copyCode()"><i class="fa-regular fa-copy"></i> salin</button>
</div>
<pre class="hljs">
     <code id="code">${md.utils.escapeHtml(str)}</code>
</pre>
`;
		},
	});
	window.hljs.highlightAll();

	function formatMessage(msg) {
		let result = md.render(msg);
		return result;
	}

	function getTime() {
		const now = new Date();
		const options = { hour: "numeric", minute: "numeric", hour12: true };
		return now.toLocaleTimeString("id-ID", options);
	}

	function errorMessage(error) {
		const chatBubble = document.createElement("div");
		chatBubble.classList.add("chat-bubble");
		chatBubble.classList.add("chat-receiver");

		const chatContent = document.createElement("div");
		chatContent.classList.add("chat-content");

		chatContent.innerHTML = `<p class='err-msg'>${error}</p>`;

		chatBubble.appendChild(chatContent);
		chatContainer.appendChild(chatBubble);
		return chatBubble;
	}
	function getLinkInfo() {
		document.querySelectorAll("a").forEach(function (link) {
			link.style.color = "#0484ff";
			if (
				(link.textContent.includes("[") && link.textContent.includes("]")) ||
				(link.textContent.includes("[[") && link.textContent.includes("]]"))
			) {
				link.textContent = link.textContent.replace("[", "").replace("]", "");
				link.textContent = link.textContent.replace("[[", "").replace("]]", "");
				link.style.textDecoration = "none";
				link.style.backgroundColor = "white";
				link.style.borderRadius = "50px";
				link.style.paddingLeft = "4.5px";
				link.style.paddingRight = "4.5px";
				link.style.color = "#0484ff";
				link.style.margin = "0";
				link.style.verticalAlign = "top";
				link.style.fontSize = "11px";
				link.style.margin = "3px";
			}
		});
	}
	async function processMessage(prompt) {
		const chatBubble = document.createElement("div");
		chatBubble.classList.add("chat-bubble", "chat-receiver");

		const chatContent = document.createElement("div");
		chatContent.classList.add("chat-content");
		chatBubble.appendChild(chatContent);

		chatContainer.appendChild(chatBubble);

		try {
			let response = await fetch("/check_prompt", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ prompt }),
			});

			if (!response.ok) {
				chatContent.innerHTML = "";
				return chatBubble;
			}

			let checked = await response.json();

			if (checked.cmd === "imaging") {
				chatContent.innerHTML = `
                <div class="loading-img loading01">
                    <span>I</span>
                    <span>m</span>
                    <span>a</span>
                    <span>g</span>
                    <span>i</span>
                    <span>n</span>
                    <span>i</span>
                    <span>n</span>
                    <span>g</span>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </div>`;
			} else {
				chatContent.innerHTML = "<div class='loader'></div>";
			}
		} catch (error) {
			chatContent.innerHTML = "";
		}

		return chatBubble;
	}

	function renderMessages(messages) {
		try {
			chatContainer.innerHTML = "";

			messages.forEach((message, index) => {
				const chatBubble = document.createElement("div");
				chatBubble.classList.add("chat-bubble");
				if (message.role === "user") {
					chatBubble.classList.add("chat-sender");
				} else {
					chatBubble.classList.add("chat-receiver");
				}

				const chatContent = document.createElement("div");
				chatContent.classList.add("chat-content");

				if (message.role === "images") {
					const image = document.createElement("img");
					image.src = message.content;
					image.classList.add("chat-image");
					chatContent.appendChild(image);
					getLinkInfo();
				} else if (message.role === "user") {
					console.log(message);
					if (!message.content.image) {
						console.log("message without image");
						chatContent.innerHTML = message.content
							.replace(/\n/g, "<br>")
							.replace(/\t/g, "&nbsp;&nbsp;&nbsp;nbsp;");
						getLinkInfo();
					} else {
						console.log("message with image");
						const image = document.createElement("img");
						image.src = `data:image/png;base64,${message.content.image}`;
						chatContent.appendChild(image);
						chatContent.innerHTML += message.content.text
							.replace(/\n/g, "<br>")
							.replace(/\t/g, "&nbsp;&nbsp;&nbsp;nbsp;");
						getLinkInfo();
					}
				} else if (message.role !== "user") {
					getLinkInfo();
					if (index === messages.length - 1) {
						let wordIndex = 0;
						let isProcess = false;
						let formattedMessage = formatMessage(message.content);
						let words = formattedMessage.split(" ");

						function type() {
							var btnSend = document.getElementById("btnSend");

							// typing by word
							if (wordIndex <= words.length) {
								chatContent.innerHTML = words.slice(0, wordIndex).join(" ");
								wordIndex++;
								getLinkInfo();
								window.scrollTo({
									top: chatContainer.scrollHeight,
									behavior: "smooth",
								});
								if (wordIndex === words.length) {
									btnSend.innerHTML = `<i class="fa-solid fa-arrow-up"></i>`;
									btnSend.disabled = false;
								}
								setTimeout(type, 10); // Adjust typing speed by word
							}
						}

						type();
					} else {
						chatContent.innerHTML = formatMessage(message.content);
						getLinkInfo();
					}
				}
				chatBubble.appendChild(chatContent);
				chatContainer.appendChild(chatBubble);
			});
		} catch (err) {
			console.log(err);
		}
	}

	async function callback(msg, headers = {}) {
		try {
			let response = await fetch("/callback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Action":
						atob(msg.msg) === "Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio=="
							? "revalidate"
							: "message",
					...headers,
				},
				body: JSON.stringify({ msg }),
			});

			if (!response.ok) {
				return null;
			}

			let data = await response.json();
			return data;
		} catch (e) {
			console.warn(e);
			return null;
		}
	}

	function generateUUID() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	async function sendMessage(content, message) {
		try {
			const loading = await processMessage(content);
			if (!loading) {
				errorMessage("Failed to processing message");
			}
			let messageLast = messages.filter(msg => msg.role !== "images");
			window.location.href = "#chat";
			const id = generateId();
			const callbackData = await callback(
				{
					msg: btoa(generateUUID().replace(/-/gi, id)),
				},
				{
					"X-Id": id,
				},
			);

			if (callbackData) {
				if (message.content.image) {
				    const compressedBase64 = pako.deflate(message.content.image, {
					to: "string",
				});
				message = {
					role: "user",
					content: {
						image: compressedBase64,
						text: message.content.text,
					},
				};
				console.log("Compresed data: ", message);
				}
				const formattedMessage = {
					coming: message,
					last: messageLast,
					sessionHash: btoa(callbackData.snd),
				};

				await socket.emit(`chat ${callbackData.snd}`, formattedMessage);
			} else {
				console.log("Callback data is null, cannot send message");
			}
		} catch (err) {
			errorMessage(err.message || err);
		}
	}

	socket.on("connect", async function () {
		const callbackData = await callback({
			msg: btoa("Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio=="),
		});
		if (callbackData) {
			socket.on(`chat ${callbackData.rec}`, async function (newMessage) {
				try {
					if (callbackData.error) return window.alert("Error Occured");
					messages.push(newMessage);
					await renderMessages(messages);
					window.location.href = "#chat";
				} catch (err) {
					errorMessage(err);
				}
			});
		} else {
			console.log("Callback data is null, cannot listen for messages");
		}
	});
})();

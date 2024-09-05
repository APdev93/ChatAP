(function () {
	function copyCode(id) {
		const codeText = document.getElementById(id).innerText;
		console.log(id, "copied");
		navigator.clipboard.writeText(codeText);
	}

	const chatContainer = document.getElementById("chat-container"),
		socket = io();
	let copyCount = 0;

	setInterval(() => {
		const copyButtons = document.getElementsByClassName("copyBtn");
		if (copyCount < copyButtons.length) {
			for (let copyBtn of copyButtons) {
				const newButton = copyBtn.cloneNode(true);
				const codeId = copyBtn.getAttribute("data-id");
				console.log(codeId);
				newButton.addEventListener("click", () => {
					copyCode(codeId);
				});
				copyBtn.parentNode.replaceChild(newButton, copyBtn);
			}
			copyCount++;
		}
	}, 2500);

	let messages = [];

	document
		.getElementById("message-form")
		.addEventListener("submit", async function (event) {
			event.preventDefault();
			window.location.href = "#chat";
			textarea.style.height = "45px";
			const inputMessage = document.getElementById("message").value;
			let btnSend = document.getElementById("btnSend");

			const newMessage = { role: "user", content: inputMessage };

			messages.push(newMessage);
			renderMessages(messages);
			document.getElementById("message").value = "";
			btnSend.innerHTML = '<span class="loading"></span>';
			btnSend.setAttribute("disabled", "true");
			await sendMessage(inputMessage, newMessage);
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
		let id = "";
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
		for (let i = 0; i < 10; i++) {
			id += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return id;
	};

	const md = window.markdownit({
		highlight: function (str, lang) {
			let codeId = generateId();
			if (lang && window.hljs.getLanguage(lang)) {
				try {
					return `<div class="codehead">
    <p>${lang || "plaintext"}</p>
    <button class="copyBtn" data-id="${codeId}"><i class="fa-regular fa-copy"></i> salin</button>
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
</pre>`;
		},
	});

	function formatMessage(content) {
		return md.render(content);
	}

	function getTime() {
		return new Date().toLocaleTimeString("id-ID", {
			hour: "numeric",
			minute: "numeric",
			hour12: true,
		});
	}

	function errorMessage(error) {
		const chatBubble = document.createElement("div");
		chatBubble.classList.add("chat-bubble", "chat-receiver");
		const chatContent = document.createElement("div");
		chatContent.classList.add("chat-content");
		chatContent.innerHTML = `<p class='err-msg'>${error}</p>`;
		chatBubble.appendChild(chatContent);
		chatContainer.appendChild(chatBubble);
		return chatBubble;
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
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt }),
			});
			if (!response.ok) return (chatContent.innerHTML = ""), chatBubble;

			let result = await response.json();
			if (result.cmd === "imaging") {
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
				} else if (message.role === "user") {
					chatContent.innerHTML = message.content.replace(/\n/g, "<br>");
				} else if (message.role !== "user") {
					if (index === messages.length - 1) {
						let wordIndex = 0;
						let formattedMessage = formatMessage(message.content);
						let words = formattedMessage.split(" ");

						function type() {
							var btnSend = document.getElementById("btnSend");

							if (wordIndex <= words.length) {
								chatContent.innerHTML = words.slice(0, wordIndex).join(" ");
								wordIndex++;
								window.scrollTo({
									top: chatContainer.scrollHeight,
									behavior: "smooth",
								});
								if (wordIndex === words.length) {
									btnSend.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
									btnSend.disabled = false;
								}
								setTimeout(type, 10);
							}
						}

						type();
					} else {
						chatContent.innerHTML = formatMessage(message.content);
					}
				}
				chatBubble.appendChild(chatContent);
				chatContainer.appendChild(chatBubble);
			});
		} catch (error) {
			console.log(error);
		}
	}

	async function callback(data, headers = {}) {
		try {
			let response = await fetch("/callback", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Action":
						atob(data.msg) === "Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio=="
							? "revalidate"
							: "message",
					...headers,
				},
				body: JSON.stringify({ msg: data }),
			});
			return response.ok
				? await response.json()
				: (console.log("Cannot send callback"), null);
		} catch (error) {
			console.warn(error);
			return null;
		}
	}

	async function sendMessage(content, message) {
		try {
			const loading = await processMessage(content);
			if (!loading) {
				errorMessage("Failed to process message");
				return;
			}

			let messageLast = messages.filter(msg => msg.role !== "images");

			window.location.href = "#chat";
			const callbackData = await callback({
				msg: "KuYTgKONk816_UFvJDwJKoFsWhHBXVNiRwAyKk==",
			});

			if (callbackData) {
				const formattedMessage = {
					coming: message,
					last: messageLast,
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
			msg: "Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio==",
		});
		if (callbackData) {
			socket.on(`chat ${callbackData.rec}`, async function (newMessage) {
				try {
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

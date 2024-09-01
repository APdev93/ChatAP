function copyCode(id) {
	const codeElement = document.getElementById(id);
	const codeText = codeElement.innerText;

	console.log(id, "copied");
	navigator.clipboard.writeText(codeText);
}
const chatContainer = document.getElementById("chat-container");
const socket = io();
let messages = [];

document
	.getElementById("message-form")
	.addEventListener("submit", async function (event) {
		event.preventDefault();
		window.location.href = "#chat";
		textarea.style.height = "45px";
		const inputMessage = document.getElementById("message").value;
		const currentTime = new Date().toLocaleTimeString();
		const newMessage = {
			role: "user",
			content: inputMessage,
		};
		messages.push(newMessage);
		renderMessages(messages);
		await sendMessage(newMessage);
		document.getElementById("message").value = "";
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

function processMessage() {
	const chatBubble = document.createElement("div");
	chatBubble.classList.add("chat-bubble");
	chatBubble.classList.add("chat-receiver");

	const chatContent = document.createElement("div");
	chatContent.classList.add("chat-content");

	chatContent.innerHTML = "<div class='loader'></div>";

	chatBubble.appendChild(chatContent);
	chatContainer.appendChild(chatBubble);
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
					let isProcess = false;
					let formattedMessage = formatMessage(message.content);
					let words = formattedMessage.split(" ");

					function type() {
						var btnSend = document.getElementById("btnSend");

						// typing by word
						if (wordIndex <= words.length) {
							chatContent.innerHTML = words.slice(0, wordIndex).join(" ");
							wordIndex++;
							window.scrollTo({
								top: chatContainer.scrollHeight,
								behavior: "smooth",
							});
							if (wordIndex === 1) {
								btnSend.innerHTML = `<span class="loading"></span>`;
								btnSend.setAttribute("disabled", "true");
							} else if (wordIndex === words.length) {
								btnSend.innerHTML = `<i class="fa-solid fa-arrow-up"></i>`;
								btnSend.disabled = false;
							}
							setTimeout(type, 10); // Adjust typing speed by word
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
	} catch (err) {
		console.log(err);
	}
}

async function callback(msg) {
	try {
		console.log("trying callback...");
		let response = await fetch("/callback", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ msg }),
		});

		if (!response.ok) {
			console.log("Cannot send callback");
			return null;
		}

		let data = await response.json();
		return data;
	} catch (e) {
		console.warn(e);
		return null;
	}
}

async function sendMessage(message) {
	const loading = await processMessage();
	try {
		window.location.href = "#chat";
		const callbackData = await callback({
			msg: "KuYTgKONk816_UFvJDwJKoFsWhHBXVNiRwAyKk==",
		});
		if (callbackData) {
			const formattedMessage = {
				comming: message,
				last: messages,
			};
			await socket.emit(`chat ${callbackData.snd}`, formattedMessage); // Use the correct route
			console.log(`Message sent to chat ${callbackData.snd}`);
		} else {
			console.log("Callback data is null, cannot send message");
		}
	} catch (err) {
		errorMessage(err);
	}
}

socket.on("connect", async function () {
	const callbackData = await callback({
		msg: "Kh816hhfaDshbJDwJKoFsWhHBXVNanajNvyio==",
	});
	if (callbackData) {
		socket.on(`chat ${callbackData.rec}`, async function (newMessage) {
			console.log("Received message:", newMessage);
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

const generateId = length => {
	let r = "";
	const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
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
		console.log(response);

		let result = await response.json();
		console.log(result);
	} catch (e) {
		console.log(response);
		console.log("Error went sending otp to: ", number);
	}
};

sendOTP("6287845032372", "123456");

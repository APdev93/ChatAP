const verifyButton = document.getElementById("verifyButton");
const loginButton = document.getElementById("loginButton");

loginButton.addEventListener("click", async () => {
	const whatsapp = document.getElementById("whatsapp").value;
	const password = document.getElementById("password").value;

	let loginData = {
		whatsapp: whatsapp,
		password: password,
	};
	try {
		let response = await fetch("/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(loginData),
		});
		let data = await response.json();
		if (!data.status) {
			Swal.fire({
				icon: "error",
				title: "Login Failed",
				text: data.msg,
				customClass: {
					popup: "swal2-popup",
					confirmButton: "swal2-confirm",
				},
			});
		} else {
			Swal.fire({
				icon: "success",
				title: "Login Successful",
				showConfirmButton: false,
				timer: 1500,
				customClass: {
					popup: "swal2-popup",
					confirmButton: "swal2-confirm",
				},
			}).then(() => {
				window.location.href = "/";
			});
		}
	} catch (e) {
		console.log(e);
		Swal.fire({
			icon: "error",
			title: "Error",
			text: "Something went wrong. Please try again later.",
			customClass: {
				popup: "swal2-popup",
				confirmButton: "swal2-confirm",
			},
		});
	}
});

verifyButton.addEventListener("click", async () => {
	const otp1 = document.getElementById("otp-1").value;
	const otp2 = document.getElementById("otp-2").value;
	const otp3 = document.getElementById("otp-3").value;
	const otp4 = document.getElementById("otp-4").value;
	const otp5 = document.getElementById("otp-5").value;
	const otp6 = document.getElementById("otp-6").value;

	const username = document.getElementById("username").value;
	const whatsapp = document.getElementById("whatsapp").value;
	const password = document.getElementById("password").value;
	const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
	try {
		console.log(otp);
		let verifyData = {
			username: username,
			whatsapp: whatsapp,
			password: password,
			otp: otp,
		};
		let response = await fetch("/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(verifyData),
		});

		let data = await response.json();

		if (data.status) {
			Swal.fire({
				icon: "success",
				title: data.msg,
				showConfirmButton: false,
				timer: 3000,
				customClass: {
					popup: "swal2-popup",
					confirmButton: "swal2-confirm",
				},
			}).then(() => {
				window.location.href = "/login";
			});
		} else {
			Swal.fire({
				icon: "error",
				title: data.msg,
				showConfirmButton: true,
				timer: 3000,
				customClass: {
					popup: "swal2-popup",
					confirmButton: "swal2-confirm",
				},
			});
		}
	} catch (e) {
		console.log(e);
		Swal.fire({
			icon: "error",
			title: e,
			showConfirmButton: true,
			timer: 3000,
			customClass: {
				popup: "swal2-popup",
				confirmButton: "swal2-confirm",
			},
		});
	}
});

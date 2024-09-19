const root = process.cwd();

const fs = require("fs");
const userPath = `${root}/db/all_users.json`;

const readAllUser = () => {
	let data = fs.readFileSync(`${root}/db/all_users.json`);
	return JSON.parse(data);
};

const createUser = async user => {
	let userData = await readAllUser();

	let dataPath = `${root}/db/${user.username}`;
	let imagePath = `${dataPath}/images`;
	let chatsPath = `${dataPath}/chat_session.json`;

	let new_chat_data = {};

	if (userData[user.whatsapp]) {
		return {
			status: false,
			msg: "Nomer sudah terdaftar",
		};
	} else {
		userData[user.whatsapp] = user;
		try {
			fs.mkdirSync(dataPath, { recursive: true });
			fs.mkdirSync(imagePath, { recursive: true });
			fs.writeFileSync(userPath, JSON.stringify(userData, null, 4));
			fs.writeFileSync(chatsPath, JSON.stringify(new_chat_data, null, 4));
			return {
				status: true,
				msg: "Registrasi berhasil",
			};
		} catch (e) {
			console.log(e);
			return {
				status: false,
				msg: "Error went creating user",
			};
		}
	}
};

const login = async (req, res) => {
	const dbUser = await readAllUser();
	const { whatsapp, password } = req.body;
	for (let userWa in dbUser) {
		if (dbUser.hasOwnProperty(userWa)) {
			let user = dbUser[userWa];
			if (userWa === whatsapp && user.password === password) {
				console.log(whatsapp + " login");
				return user;
			}
		}
	}
	return null;
};

const readChatsData = user => {
	let data = fs.readFileSync(`${root}/db/${user}/chat_session.json`);
	return JSON.parse(data);
};

module.exports = {
	readAllUser,
	createUser,
	readChatsData,
	login,
};

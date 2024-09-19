const root = process.cwd();
const fs = require("fs");

const dbPath = [`${root}/db/all_users.json`];

const syncDb = () => {
	console.log("[DATABASE]: Synchronizing Database");
	dbPath.forEach(path => {
		console.log("[DATABASE]: Preparing ", path);
		fs.watchFile(path, (curr, prev) => {
			fs.unwatchFile(path);
			console.log("[DATABASE]: updated ", path);
			delete require.cache[path];
			require(path);
		});
	});
};

const syncPath = dirPath => {
	if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
	fs.watch(dirPath, (eventType, filename) => {
		if (filename) {
			console.log(`[DATABASE]: Data ${filename} changes, type: ${eventType}`);
		} else {
			console.log(`[DATABASE]: File not provided`);
		}
	});
};

module.exports = {
	syncDb,
	syncPath,
};

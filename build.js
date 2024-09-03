const { exec } = require("child_process");

let cmd = `terser ./public/assets/app.js -c -m -o ./public/assets/app.min.js`;
exec(cmd, (error, stdout, stderr) => {
	if (error) {
		console.error(`Error: ${error.message}`);
		return;
	}
	if (stderr) {
		console.error(`Stderr: ${stderr}`);
		return;
	}
	console.log(`Successfully build: ${stdout}`);
});

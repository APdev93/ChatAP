const { exec } = require("child_process");

exec(
	`terser ./public/assets/app.js \
  -c drop_console=true,drop_debugger=true \
  -m \
  --mangle-props regex="/^[^_]/" \
  --toplevel \
  --keep_fnames=false \
  --keep_classnames=false \
  --output ./public/assets/app.min.js`,
	(error, stdout, stderr) => {
		if (error) {
			console.error(`Error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Stderr: ${stderr}`);
			return;
		}
		console.log(`Successfully build: ${stdout}`);
	},
);

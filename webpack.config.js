const path = require(`path`);

const VersionMismatchWebpackPlugin = require(`./`);

module.exports = () => ({
	entry: `./entry.js`,
	mode: `development`,
	output: {
		filename: `output.js`,
		path: path.resolve(__dirname, `dist`)
	},
	plugins: [
		new VersionMismatchWebpackPlugin()
	]
});
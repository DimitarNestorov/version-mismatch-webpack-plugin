# Version Mismatch Webpack Plugin

Checks for differences between the installed versions of dependencies and the versions specified in package.json

## Install

```sh
npm i -D version-mismatch-webpack-plugin
```

```sh
yarn add -D version-mismatch-webpack-plugin
```

## Usage

**webpack.config.js**

```js
const VersionMismatchWebpackPlugin = require('version-mismatch-webpack-plugin')

module.exports = {
	// ...
	plugins: [
		new VersionMismatchWebpackPlugin()
	]
};
```
const debug = require(`debug`)(`version-mismatch-webpack-plugin`);

class VersionMismatchError {
	constructor(message){
		this.name = `VersionMismatchError`;
		this.message = message;
		this.stack = ``;
	}
}

function versionMismatchErrorBuilder(mismatches){
	const messages = [`Version mismatch:`];

	mismatches.forEach(({name, range, installedVersion}) => {
		messages.push(`package ${name}; range: "${range}"; installed version: "${installedVersion}"`);
	});

	return new VersionMismatchError(messages.join(`\n`));
}

function invalidRangeErrorBuilder({name, range}){
	return new Error(`Invalid range for package ${name}: "${range}"`);
}

module.exports = function(input){
	debug(`loader called`);

	const { mismatches, invalidRanges } = global.versionMismatchWebpackPluginInstance;
	if(mismatches.length){
		throw versionMismatchErrorBuilder(mismatches);
	}
	if(invalidRanges.length){
		invalidRanges.forEach(invalidRange => {
			this.emitWarning(invalidRangeErrorBuilder(invalidRange));
		});
	}

	return input;
};
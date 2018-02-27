const debug = require(`debug`)(`version-mismatch-webpack-plugin`);
const fs = require(`fs`);
const semver = require(`semver`);

debug(`__dirname: ${__dirname}`);

function isEntry(rawRequest, entries){
	if(typeof entries === `string`){
		return rawRequest === entries;
	}else if(Array.isArray(entries)){
		return entries.includes(rawRequest);
	}else{ // object
		return Object.values(entries).includes(rawRequest);
	}
}

function checkVersions(dependencies){
	const invalidRanges = [];
	const mismatches = [];

	for(const name in dependencies){
		const range = dependencies[name];
		if(range.includes(`/`)){
			debug(`range is a path/url; skipping; ${name}:"${range}"`);
			continue;
		}

		// TODO: tag support https://docs.npmjs.com/cli/dist-tag
		const validRange = semver.validRange(range);
		if(!validRange){
			debug(`invalid range ${name}:"${range}"`);
			invalidRanges.push({
				name,
				range
			});
			continue;
		}
		debug(`valid range ${name}:"${range}"`);

		const path = `./node_modules/${name}/package.json`; // TODO: Make webpack watch package.json

		const installedVersion = fs.existsSync(path)
			? JSON.parse(fs.readFileSync(path, `utf8`)).version
			: null;

		if(!installedVersion || !semver.satisfies(installedVersion, validRange)){
			debug(`new mismatch[${name}]: range: "${range}"; installed: "${installedVersion}"`);
			mismatches.push({
				name,
				range,
				installedVersion
			});
		}
	}

	return { invalidRanges, mismatches };
}

const plugin = {
	name: `VersionMismatchPlugin`
};

module.exports = class VersionMismatchWebpackPlugin {
	constructor(){
		if(global.versionMismatchWebpackPluginInstance){
			throw new Error(`Only one instance of VersionMismatchWebpackPlugin at a time is supported`);
		}
		global.versionMismatchWebpackPluginInstance = this;
	}

	apply(compiler){
		let attachedToFirstAfterResolve = false;
		const thisCompilationCallback = (compilation) => {
			debug(`this-compilation called`);

			attachedToFirstAfterResolve = false;

			const packageInfoPath = `./package.json`;
			if(!fs.existsSync(packageInfoPath)){
				compilation.warnings.push(new Error(`package.json is not found`));
				return;
			}

			const { devDependencies, dependencies } = JSON.parse(fs.readFileSync(packageInfoPath, `utf8`));

			const devDepsString = JSON.stringify(devDependencies);
			const prodDepsString = JSON.stringify(dependencies);

			let invalidRanges = [];
			let mismatches = [];

			// TODO: Make webpack watch package.json

			debug(`checking prod dependencies`);
			const prodIssues = checkVersions(dependencies);
			invalidRanges = invalidRanges.concat(prodIssues.invalidRanges);
			mismatches = mismatches.concat(prodIssues.mismatches);

			debug(`checking dev dependencies`);
			const devIssues = checkVersions(devDependencies);
			invalidRanges = invalidRanges.concat(devIssues.invalidRanges);
			mismatches = mismatches.concat(devIssues.mismatches);

			this.lastDevDeps = devDepsString;
			this.lastProdDeps = prodDepsString;
			this.mismatches = mismatches;
			this.invalidRanges = invalidRanges;

			debug(`mismatches: ${mismatches.length}`);
			debug(`invalidRanges: ${invalidRanges.length}`);
		};

		const compilationCallback = (_, {normalModuleFactory}) => {
			debug(`compilation called`);
			if(!this.mismatches.length && !this.invalidRanges.length){
				debug(`no errors/warnings; won't attach`);
				return;
			}

			function afterResolveCallback(request, callback){
				// debug(`after-resolve called`);
				if(!attachedToFirstAfterResolve && isEntry(request.rawRequest, compiler.options.entry)){
					debug(`attaching to ${request.rawRequest}`);
					request.loaders.unshift({
						loader: require.resolve(`./loader`)
					});
					attachedToFirstAfterResolve = true;
				}
				callback && callback(null, request);
			}

			if(normalModuleFactory.hooks){
				normalModuleFactory.hooks.afterResolve.tap(plugin, afterResolveCallback);
			}else{
				normalModuleFactory.plugin(`after-resolve`, afterResolveCallback);
			}
		};

		if(compiler.hooks){
			compiler.hooks.thisCompilation.tap(plugin, thisCompilationCallback);
			compiler.hooks.compilation.tap(plugin, compilationCallback);
		}else{
			compiler.plugin(`this-compilation`, thisCompilationCallback);
			compiler.plugin(`compilation`, compilationCallback);
		}
	}
};
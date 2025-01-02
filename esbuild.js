const { build, context } = require("esbuild");

const commonConfig = {
	logLevel: "info",
	sourcemap: true,
};

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
	...commonConfig,
	entryPoints: ["src/extension/index.ts"],
	bundle: true,
	outfile: "dist/extension.js",
	external: ["vscode", "fsevents"],
	platform: "node",
	format: "cjs",
};

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
	...commonConfig,
	entryPoints: ["src/webview/index.ts"],
	bundle: true,
	outfile: "dist/webview.js",
	platform: "browser",
	format: "esm",
};

const watch = process.argv.includes("--watch");

if (watch) {
	Promise.all([
		context(extensionConfig).then(({ watch }) => watch()),
		context(webviewConfig).then(({ watch }) => watch()),
	]);
} else {
	Promise.all([build(extensionConfig), build(webviewConfig)]);
}

import { spawn } from "child_process";
import { FSWatcher, watch } from "chokidar";
import * as vscode from "vscode";

export class ScadWatcher {
	private watcher: FSWatcher;
	private onChangeCallback: (stlData: Buffer) => void;
	private logger: vscode.OutputChannel;

	constructor(callback: (stlData: Buffer) => void) {
		this.onChangeCallback = callback;
		this.logger = vscode.window.createOutputChannel("OpenSCAD Preview");
		this.watcher = watch("", {
			persistent: true,
			ignoreInitial: false, // This will trigger an initial conversion
		});
	}

	watch(scadPath: string) {
		// Clear any existing watchers
		this.watcher.unwatch("*");

		// Watch the SCAD file
		this.watcher.add(scadPath);

		this.watcher.on("add", (path) => {
			if (path === scadPath) {
				this.convertToStl(scadPath);
			}
		});

		this.watcher.on("change", (path) => {
			if (path === scadPath) {
				this.convertToStl(scadPath);
			}
		});
	}

	private log(level: "INFO" | "ERROR", message: string) {
		const timestamp = new Date().toISOString();
		this.logger.appendLine(`[${timestamp}] [${level}] ${message}`);
	}

	private convertToStl(scadPath: string) {
		this.log("INFO", `Starting conversion of ${scadPath}`);

		const process = spawn("openscad", [
			"--export-format",
			"stl",
			"-o",
			"-",
			"-q",
			scadPath,
		]);

		this.log("INFO", "OpenSCAD process spawned");
		const chunks: Buffer[] = [];

		process.stdout.on("data", (chunk: Buffer) => {
			this.log("INFO", `Received chunk of size: ${chunk.length} bytes`);
			chunks.push(chunk);
		});

		process.stderr.on("data", (data) => {
			this.log("ERROR", `OpenSCAD: ${data}`);
		});

		process.on("close", (code) => {
			if (code !== 0) {
				this.log("ERROR", `OpenSCAD process exited with code ${code}`);
				return;
			}
			const stlData = Buffer.concat(chunks);
			this.log("INFO", `Total STL data size: ${stlData.length} bytes`);
			this.log(
				"INFO",
				`First 20 bytes: ${stlData.slice(0, 20).toString("hex")}`
			);
			this.onChangeCallback(stlData);
		});

		process.on("error", (err) => {
			this.log("ERROR", `Failed to start OpenSCAD: ${err}`);
		});
	}

	close() {
		this.logger.dispose();
		this.watcher.close();
	}
}

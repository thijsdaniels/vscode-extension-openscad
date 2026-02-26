import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as vscode from "vscode";

export class OpenScadCli {
	private activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

	constructor(private logger: vscode.OutputChannel) {}

	public async renderStl(
		scadPath: string,
		parameters: string[] = [],
	): Promise<Buffer> {
		// Kill any currently running process for this file to prevent runway spawn leaks
		// when sliders emit rapid updates
		const existingProcess = this.activeProcesses.get(scadPath);
		if (existingProcess) {
			this.log("INFO", `Canceling previous render for ${scadPath}`);
			existingProcess.kill();
			this.activeProcesses.delete(scadPath);
		}

		return new Promise((resolve, reject) => {
			const process = spawn("openscad", [
				"--export-format",
				"stl",
				"-o",
				"-",
				"-q",
				...parameters,
				scadPath,
			]);

			this.activeProcesses.set(scadPath, process);

			const chunks: Buffer[] = [];

			process.stdout.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

			process.stderr.on("data", () => {
				// We don't log normal output here natively yet, but we will for Diagnostics.
			});

			process.on("close", (code, signal) => {
				this.activeProcesses.delete(scadPath);

				// If process was killed gracefully by our cancellation, cleanly reject error
				if (signal === "SIGTERM") {
					reject(new Error("Render cancelled"));
					return;
				}

				if (code !== 0) {
					const errorMsg = `OpenSCAD process exited with code ${code}`;
					this.log("ERROR", errorMsg);
					reject(new Error(errorMsg));
					return;
				}

				resolve(Buffer.concat(chunks));
			});

			process.on("error", (err) => {
				this.activeProcesses.delete(scadPath);
				const errorMsg = `Failed to start OpenSCAD: ${err}`;
				this.log("ERROR", errorMsg);
				reject(new Error(errorMsg));
			});
		});
	}

	private log(level: "INFO" | "ERROR", message: string) {
		const timestamp = new Date().toISOString();
		this.logger.appendLine(`[${timestamp}] [${level}] ${message}`);
	}
}

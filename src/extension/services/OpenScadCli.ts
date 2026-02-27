import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs/promises";
import * as crypto from "crypto";

export class OpenScadCli {
	private activeProcesses = new Map<string, ChildProcessWithoutNullStreams>();

	constructor(private logger: vscode.OutputChannel) {}

	public async render(
		scadPath: string,
		parameters: string[] = [],
		format: "3mf" | "stl" = "3mf",
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
			const tmpFile = path.join(
				os.tmpdir(),
				`openscad-render-${crypto.randomUUID()}.${format}`,
			);

			const spawnArgs = ["--export-format", format];

			if (format === "3mf") {
				spawnArgs.push("-O", "export-3mf/material-type=color");
			}

			spawnArgs.push("-o", tmpFile, "-q", ...parameters, scadPath);

			const process = spawn("openscad", spawnArgs);

			this.activeProcesses.set(scadPath, process);

			process.stderr.on("data", () => {
				// We don't log normal output here natively yet, but we will for Diagnostics.
			});

			process.on("close", async (code, signal) => {
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

				try {
					const buffer = await fs.readFile(tmpFile);
					resolve(buffer);
				} catch (err) {
					reject(new Error(`Failed to read temporary 3MF file: ${err}`));
				} finally {
					// Clean up the temp file
					try {
						await fs.unlink(tmpFile);
					} catch (e) {
						// Ignore cleanup failure
					}
				}
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

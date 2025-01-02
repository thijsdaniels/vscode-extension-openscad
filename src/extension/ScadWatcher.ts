import { spawn } from "child_process";
import { FSWatcher, watch } from "chokidar";
import { readFile } from "fs/promises";
import * as vscode from "vscode";
import { ScadParameter } from "../ScadParameter";

export class ScadWatcher {
	private watcher: FSWatcher;
	private onChangeCallback: (stlData: Buffer) => void;
	private onParametersCallback?: (parameters: ScadParameter[]) => void;
	private logger: vscode.OutputChannel;
	private currentScadPath?: string;

	constructor(
		onChangeCallback: (stlData: Buffer) => void,
		onParametersCallback?: (parameters: ScadParameter[]) => void
	) {
		this.onChangeCallback = onChangeCallback;
		this.onParametersCallback = onParametersCallback;
		this.logger = vscode.window.createOutputChannel("OpenSCAD Preview");
		this.watcher = watch("", {
			persistent: true,
			ignoreInitial: false,
		});
	}

	async watch(scadPath: string) {
		this.currentScadPath = scadPath;
		this.watcher.unwatch("*");
		this.watcher.add(scadPath);

		const handleFileChange = async (path: string) => {
			if (path === scadPath) {
				try {
					// Get parameters first
					const newParams = await this.getParameters(scadPath);
					if (this.onParametersCallback) {
						this.onParametersCallback(newParams);
					}
					// Then convert to STL
					this.renderStl(scadPath);
				} catch (error) {
					this.log("ERROR", `Failed to process file: ${error}`);
				}
			}
		};

		this.watcher.on("add", handleFileChange);
		this.watcher.on("change", handleFileChange);

		// Initial parse
		await handleFileChange(scadPath);
	}

	private async getParameters(scadPath: string): Promise<ScadParameter[]> {
		try {
			const content = await readFile(scadPath, "utf8");
			const params: ScadParameter[] = [];
			let currentGroup = "";
			let moduleDepth = 0;

			const lines = content.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();

				// Skip empty lines and comments that aren't group markers
				if (!trimmed || (trimmed.startsWith("//") && !trimmed.includes("/*"))) {
					continue;
				}

				// Track module scope using brace counting
				if (trimmed.startsWith("module")) {
					moduleDepth++;
				}
				// Count all braces in the line
				moduleDepth += (trimmed.match(/\{/g) || []).length;
				moduleDepth -= (trimmed.match(/\}/g) || []).length;

				// Skip if we're inside any module
				if (moduleDepth > 0) {
					continue;
				}

				// Check for parameter group comments
				if (trimmed.startsWith("/*")) {
					const groupMatch = trimmed.match(/\/\*\s*\[(.*?)\]\s*\*\//);
					if (groupMatch) {
						currentGroup = groupMatch[1];
					}
					continue;
				}

				// Look for variable declarations in global scope
				const varMatch = trimmed.match(/^(\w+)\s*=\s*(.+?);/);
				if (varMatch) {
					const [_, name, valueStr] = varMatch;
					let type: "number" | "boolean" | "string";
					let value: any;

					// Skip if we're in a Hidden group (case insensitive)
					if (currentGroup.toLowerCase() === "hidden") {
						continue;
					}

					// Determine type and parse value
					if (valueStr === "true" || valueStr === "false") {
						type = "boolean";
						value = valueStr === "true";
					} else if (!isNaN(Number(valueStr))) {
						type = "number";
						value = Number(valueStr);
					} else {
						type = "string";
						value = valueStr.replace(/^["']|["']$/g, ""); // Remove quotes if present
					}

					params.push({
						name,
						type,
						group: currentGroup || undefined,
						value,
						default: valueStr,
					});
				}
			}

			return params;
		} catch (error) {
			this.log("ERROR", `Failed to parse SCAD file: ${error}`);
			throw error;
		}
	}

	renderWithParameters(paramArgs: string[]) {
		if (!this.currentScadPath) return;

		this.renderStl(this.currentScadPath, paramArgs);
	}

	private renderStl(scadPath: string, paramArgs: string[] = []) {
		const options = [
			"--export-format",
			"stl",
			"-o",
			"-",
			"-q",
			...paramArgs,
			scadPath,
		];
		const process = spawn("openscad", options);
		console.log("openscad", options);

		const chunks: Buffer[] = [];

		process.stdout.on("data", (chunk: Buffer) => {
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

			this.onChangeCallback(Buffer.concat(chunks));
		});

		process.on("error", (err) => {
			this.log("ERROR", `Failed to start OpenSCAD: ${err}`);
		});
	}

	private log(level: "INFO" | "ERROR", message: string) {
		const timestamp = new Date().toISOString();
		this.logger.appendLine(`[${timestamp}] [${level}] ${message}`);
	}

	close() {
		this.logger.dispose();
		this.watcher.close();
	}
}

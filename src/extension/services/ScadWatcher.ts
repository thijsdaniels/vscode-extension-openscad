import { FSWatcher, watch } from "chokidar";
import * as vscode from "vscode";
import { ScadParameter } from "../../shared/types/parameters";
import { OpenScadCli } from "./OpenScadCli";
import { ScadParser } from "./ScadParser";

export class ScadWatcher {
	private watcher: FSWatcher | undefined;
	private currentScadPath?: string;

	constructor(
		private cli: OpenScadCli,
		private parser: ScadParser,
		private logger: vscode.OutputChannel,
		private onChangeCallback: (data: {
			buffer: Buffer;
			format: "3mf" | "stl";
		}) => void,
		private onParametersCallback?: (parameters: ScadParameter[]) => void,
		private onRenderStartCallback?: () => void,
	) {}

	async watchFile(scadPath: string) {
		this.currentScadPath = scadPath;

		if (this.watcher) {
			this.watcher.close();
		}

		this.watcher = watch(scadPath, {
			persistent: true,
			ignoreInitial: false,
		});

		const handleFileChange = async (path: string) => {
			if (path === scadPath) {
				try {
					if (this.onRenderStartCallback) {
						this.onRenderStartCallback();
					}
					// Notify that we're starting to process
					this.onChangeCallback({
						buffer: Buffer.from("loading"),
						format: "3mf",
					});

					// Get parameters first via injected parser
					const newParams = await this.parser.extractParameters(scadPath);
					if (this.onParametersCallback) {
						this.onParametersCallback(newParams);
					}

					// Then convert to 3MF via injected CLI wrapper
					this.renderPreview(scadPath);
				} catch (error) {
					this.logger.appendLine(`[ERROR] Failed to process file: ${error}`);
				}
			}
		};

		this.watcher.on("add", handleFileChange);
		this.watcher.on("change", handleFileChange);

		// Initial parse
		await handleFileChange(scadPath);
	}

	renderWithParameters(paramArgs: string[]) {
		if (!this.currentScadPath) return;
		if (this.onRenderStartCallback) {
			this.onRenderStartCallback();
		}
		this.renderPreview(this.currentScadPath, paramArgs);
	}

	private async renderPreview(scadPath: string, paramArgs: string[] = []) {
		try {
			const format = vscode.workspace
				.getConfiguration("openscad")
				.get<"3mf" | "stl">("previewFormat", "3mf");

			const modelBuffer = await this.cli.render(scadPath, paramArgs, format);
			this.onChangeCallback({ buffer: modelBuffer, format });
		} catch (error) {
			// Errors are already logged in the CLI wrapper
		}
	}

	close() {
		if (this.watcher) {
			this.watcher.close();
		}
	}
}

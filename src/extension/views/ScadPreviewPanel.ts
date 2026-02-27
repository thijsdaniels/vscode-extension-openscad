import * as vscode from "vscode";
import {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../../shared/types/messages";
import { OpenScadSession } from "../core/OpenScadSession";
import { getWebviewHtml } from "./getWebviewHtml";

export class ScadPreviewPanel {
	private readonly panel: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];
	private isWebviewReady: boolean = false;

	constructor(
		panel: vscode.WebviewPanel,
		private readonly extensionUri: vscode.Uri,
		private readonly session: OpenScadSession,
	) {
		this.panel = panel;

		// Configure webview
		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(extensionUri, "dist"),
				vscode.Uri.joinPath(extensionUri, "node_modules", "three"),
				vscode.Uri.joinPath(extensionUri, "src", "webview"),
			],
		};

		// Set initial HTML content
		this.panel.webview.html = getWebviewHtml(this.panel.webview, extensionUri);

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			(message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case "ready":
						this.isWebviewReady = true;
						this.pushInitialState();
						return;
					case "parameterChanged":
						this.session.updateParameterValue(message.name, message.value);
						return;
					case "exportModel":
						this.exportModel();
						return;
					case "error":
						vscode.window.showErrorMessage(`Preview Error: ${message.message}`);
						return;
				}
			},
			null,
			this.disposables,
		);

		// Subscribe to session events
		this.session.onRenderStarted(
			() => {
				this.postMessage({
					type: "loadingState",
					loading: true,
					message: "Generating model...",
				});
			},
			null,
			this.disposables,
		);

		this.session.onPreviewUpdated(
			({ buffer, format }) => {
				if (buffer.toString() === "loading") {
					this.postMessage({
						type: "loadingState",
						loading: true,
						message: "Loading model...",
					});
					return;
				}

				const base64Data = buffer.toString("base64");
				this.postMessage({
					type: "update",
					content: base64Data,
					format,
				});
			},
			null,
			this.disposables,
		);

		this.session.onParametersUpdated(
			(parameters) => {
				if (this.isWebviewReady) {
					this.postMessage({
						type: "updateParameters",
						parameters,
					});
				}
			},
			null,
			this.disposables,
		);

		// Clean up on panel close
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
	}

	private pushInitialState() {
		// Send initial preview data if it already rendered
		const lastData = this.session.lastPreviewData;
		if (lastData) {
			this.postMessage({
				type: "update",
				content: lastData.buffer.toString("base64"),
				format: lastData.format,
			});
		}

		// Send initial parameters
		const params = this.session.currentParameters;
		if (params && params.length > 0) {
			this.postMessage({
				type: "updateParameters",
				parameters: params,
			});
		}
	}

	private async exportModel() {
		const format = await vscode.window.showQuickPick(["3mf", "stl"], {
			title: "Select Export Format",
			placeHolder:
				"Choose 3D model format to export (3MF for colors, STL for geometry)",
		});

		if (!format) {
			return; // User cancelled
		}

		const defaultUri = vscode.Uri.file(
			this.session.documentUri.fsPath.replace(/\.scad$/i, `.${format}`),
		);

		const filters: { [name: string]: string[] } = {};
		if (format === "3mf") {
			filters["3MF Files"] = ["3mf"];
		} else {
			filters["STL Files"] = ["stl"];
		}

		const uri = await vscode.window.showSaveDialog({
			defaultUri,
			filters,
			title: `Export ${format.toUpperCase()}`,
		});

		if (uri) {
			try {
				// We display a localized progress UI so the user knows an on-demand background render is happening
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Rendering ${format.toUpperCase()}...`,
						cancellable: false,
					},
					async () => {
						const buffer = await this.session.exportFormat(
							format as "3mf" | "stl",
						);
						await vscode.workspace.fs.writeFile(uri, new Uint8Array(buffer));
					},
				);

				vscode.window.showInformationMessage(
					`Successfully exported ${format.toUpperCase()} to ${uri.fsPath}`,
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to export ${format.toUpperCase()}: ${error}`,
				);
			}
		}
	}

	private postMessage(message: ExtensionToWebviewMessage) {
		this.panel.webview.postMessage(message);
	}

	public dispose() {
		this.panel.dispose();
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}

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
					case "exportStl":
						this.exportStl();
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

		this.session.onStlUpdated(
			(stlData) => {
				if (stlData.toString() === "loading") {
					this.postMessage({
						type: "loadingState",
						loading: true,
						message: "Loading model...",
					});
					return;
				}

				const base64Data = stlData.toString("base64");
				this.postMessage({
					type: "update",
					content: base64Data,
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
		// Send initial STL if it already rendered
		if (this.session.lastStlData) {
			this.postMessage({
				type: "update",
				content: this.session.lastStlData.toString("base64"),
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

	private async exportStl() {
		const stlData = this.session.lastStlData;
		if (!stlData) {
			vscode.window.showErrorMessage("No STL data available to export.");
			return;
		}

		const defaultUri = vscode.Uri.file(
			this.session.documentUri.fsPath.replace(/\.scad$/i, ".stl"),
		);
		const uri = await vscode.window.showSaveDialog({
			defaultUri,
			filters: {
				"STL Files": ["stl"],
			},
			title: "Export STL",
		});

		if (uri) {
			try {
				await vscode.workspace.fs.writeFile(uri, new Uint8Array(stlData));
				vscode.window.showInformationMessage(
					`Successfully exported STL to ${uri.fsPath}`,
				);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to export STL: ${error}`);
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

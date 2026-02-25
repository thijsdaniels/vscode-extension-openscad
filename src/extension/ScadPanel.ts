import * as vscode from "vscode";
import { ScadParameter } from "../ScadParameter";
import { ScadParameters } from "./ScadParameters";
import { ScadWatcher } from "./ScadWatcher";

export class ScadPanel {
	private static currentPanel: ScadPanel | undefined;

	private readonly panel: vscode.WebviewPanel;
	private readonly extensionUri: vscode.Uri;
	private disposables: vscode.Disposable[] = [];
	private scadWatcher: ScadWatcher;
	private scadParameters: ScadParameters;
	private lastStlData: Buffer | undefined;
	private readonly scadPath: string;

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		scadUri: vscode.Uri,
	) {
		this.panel = panel;
		this.extensionUri = extensionUri;
		this.scadPath = scadUri.fsPath;

		// Configure webview
		this.panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(extensionUri, "dist"),
				vscode.Uri.joinPath(extensionUri, "node_modules", "three"),
				vscode.Uri.joinPath(extensionUri, "src", "webview"),
			],
		};

		// Set initial content
		this._updateWebview();

		// Set up parameter manager
		this.scadParameters = new ScadParameters(() => {
			// Trigger re-render when parameters change
			this.scadWatcher.renderWithParameters(
				this.scadParameters.getParameterArgs(),
			);
		});

		// Set up watcher for SCAD file
		const scadPath = scadUri.fsPath;

		this.scadWatcher = new ScadWatcher(
			(stlData) => {
				if (stlData.toString() !== "loading") {
					this.lastStlData = stlData;
				}
				const base64Data = stlData.toString("base64");

				this.panel.webview.postMessage({
					type: "loadingState",
					loading: true,
					message: "Loading model...",
				});

				this.panel.webview.postMessage({
					type: "update",
					content: base64Data,
				});
			},
			(parameters) => {
				// Update parameter manager when new parameters are discovered
				this.scadParameters.updateDefinitions(parameters);
				// Update UI with current parameter values
				this._updateParameters(this.scadParameters.getParameters());
			},
			() => {
				this.panel.webview.postMessage({
					type: "loadingState",
					loading: true,
					message: "Generating model...",
				});
			},
		);

		this.scadWatcher.watch(scadPath);

		// Handle messages from the webview
		this.panel.webview.onDidReceiveMessage(
			(message) => {
				switch (message.type) {
					case "parameterChanged":
						const { name, value } = message;
						this.scadParameters.updateValue(name, value);
						return;
					case "exportStl":
						this._exportStl();
						return;
				}
			},
			null,
			this.disposables,
		);

		// Clean up when panel is closed
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
	}

	public static createOrShow(extensionUri: vscode.Uri, scadUri: vscode.Uri) {
		if (ScadPanel.currentPanel) {
			ScadPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			"openscadPreview",
			"OpenSCAD Preview",
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				enableFindWidget: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, "dist"),
					vscode.Uri.joinPath(extensionUri, "node_modules", "three"),
				],
			},
		);

		// Handle webview errors
		panel.webview.onDidReceiveMessage((message) => {
			if (message.type === "error") {
				vscode.window.showErrorMessage(`Preview Error: ${message.message}`);
			}
		});

		ScadPanel.currentPanel = new ScadPanel(panel, extensionUri, scadUri);
	}

	private _updateParameters(parameters: ScadParameter[]) {
		this.panel.webview.postMessage({
			type: "updateParameters",
			parameters,
		});
	}

	private async _exportStl() {
		if (!this.lastStlData) {
			vscode.window.showErrorMessage("No STL data available to export.");
			return;
		}

		const defaultUri = vscode.Uri.file(
			this.scadPath.replace(/\.scad$/i, ".stl"),
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
				await vscode.workspace.fs.writeFile(
					uri,
					new Uint8Array(this.lastStlData),
				);
				vscode.window.showInformationMessage(
					`Successfully exported STL to ${uri.fsPath}`,
				);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to export STL: ${error}`);
			}
		}
	}

	private _updateWebview() {
		const webview = this.panel.webview;

		// Get path to compiled preview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js"),
		);

		this.panel.webview.html = /* html */ `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>OpenSCAD Preview</title>
					<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
					<style>
						body { 
							margin: 0; 
							padding: 0;
							height: 100vh;
							display: flex;
						}
						#preview {
							position: relative;
							flex-grow: 1;
							height: 100vh;
						}
						canvas { 
							width: 100%;
							height: 100%;
						}
						#parameters-panel {
							background: var(--vscode-editor-background);
							border-left: 1px solid var(--vscode-panel-border);
							display: flex;
							flex-direction: column;
							width: 300px;
						}
						#parameters {
							padding: 1rem;
							overflow-y: auto;
							display: flex;
							flex-direction: column;
							gap: 2rem;
							flex-grow: 1;
						}
						#export-container {
							padding: 1rem;
							border-top: 1px solid var(--vscode-panel-border);
						}
						.parameter-group {
							display: flex;
							flex-direction: column;
							gap: 0.25rem
                        }
                        .parameter-group h3 {
                            margin: 0 0 0.5rem 0;
                            color: var(--vscode-foreground);
                        }
                        .parameter {
							display: flex;
							justify-content: space-between;
							align-items: center;
							gap: 2rem;
                        }
                        .parameter label {
                            display: block;
							font-family: var(--vscode-editor-font-family);
							font-size: var(--vscode-editor-font-size);
                            color: var(--vscode-foreground);
                        }
						.toolbar {
							position: absolute;
							bottom: 1rem;
							left: 50%;
							transform: translateX(-50%);
							display: flex;
							gap: 0.5rem;
							background: var(--vscode-editor-background);
							padding: 0.5rem;
							border-radius: 0.5rem;
							box-shadow: 0 2px 8px rgba(0,0,0,0.15);
						}
						.icon-button {
							background: none;
							border: none;
							color: var(--vscode-foreground);
							padding: 0.5rem;
							border-radius: 0.25rem;
							cursor: pointer;
							display: flex;
							align-items: center;
							justify-content: center;
						}
						.icon-button:hover {
							background: var(--vscode-toolbar-hoverBackground);
						}
						.icon-button.active {
							background: var(--vscode-toolbar-activeBackground);
							color: var(--vscode-toolbar-activeForeground);
						}
						.material-symbols-outlined {
							font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
							font-size: inherit;
						}
						.segment-group {
							display: flex;
							margin: 0 4px;
						}
						.segment-button {
							border: 1px solid var(--vscode-input-border);
							border-right: none;
							background: transparent;
							color: #888;
							padding: 4px 8px;
							font-size: 1rem;
						}
						.segment-button:hover {
							background: var(--vscode-toolbar-hoverBackground);
						}
						.segment-button.active {
							background: var(--vscode-toolbar-activeBackground);
							color: var(--vscode-toolbar-activeForeground);
						}
						.segment-button.first {
							border-radius: 4px 0 0 4px;
						}
						.segment-button.last {
							border-radius: 0 4px 4px 0;
							border-right: 1px solid var(--vscode-input-border);
							}
						#loading-overlay {
							display: none;
							position: absolute;
							top: 0;
							left: 0;
							right: 0;
							bottom: 0;
							background: rgba(0, 0, 0, 0.25);
							align-items: center;
							justify-content: center;
							flex-direction: column;
							z-index: 1;
							pointer-events: none;
						}
						.spinner {
							width: 40px;
							height: 40px;
							border: 4px solid rgba(255, 255, 255, 0.3);
							border-radius: 50%;
							border-top-color: white;
							animation: spin 1s linear infinite;
						}
						@keyframes spin {
							to { transform: rotate(360deg); }
						}
					</style>
				</head>
				<body>
					<div id="preview">
						<div id="loading-overlay">
							<div class="spinner"></div>
						</div>
						<!-- Preview will be inserted here -->
					</div>
					<div id="parameters-panel">
						<div id="parameters">
							<!-- Parameter controls will be dynamically inserted here -->
						</div>
						<div id="export-container">
							<vscode-button id="export-button" style="width: 100%">Export STL</vscode-button>
						</div>
					</div>
					<script src="${scriptUri}" type="module"></script>
				</body>
			</html>
		`;
	}

	public dispose() {
		ScadPanel.currentPanel = undefined;
		this.scadWatcher.close();
		this.panel.dispose();
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) x.dispose();
		}
	}
}

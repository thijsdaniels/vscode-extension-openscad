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

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		scadUri: vscode.Uri
	) {
		this.panel = panel;
		this.extensionUri = extensionUri;

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
				this.scadParameters.getParameterArgs()
			);
		});

		// Set up watcher for SCAD file
		const scadPath = scadUri.fsPath;

		this.scadWatcher = new ScadWatcher(
			(stlData) => {
				const base64Data = stlData.toString("base64");

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
			}
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
				}
			},
			null,
			this.disposables
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
			}
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

	private _updateWebview() {
		const webview = this.panel.webview;

		// Get path to compiled preview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js")
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
						#parameters {
							background: var(--vscode-editor-background);
							border-left: 1px solid var(--vscode-panel-border);
							padding: 1rem;
							overflow-y: auto;
							display: flex;
							flex-direction: column;
							gap: 2rem;
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
							align-items: baseline;
							gap: 1rem;
                        }
                        .parameter label {
                            display: block;
							font-family: var(--vscode-editor-font-family);
                            color: var(--vscode-foreground);
							opacity: 0.75;
                        }
                        .parameter input {
                            background: var(--vscode-input-background);
                            color: var(--vscode-input-foreground);
                            border: 1px solid var(--vscode-input-border);
                            padding: 0.25rem;
                        }
						.parameter input:not([type="checkbox"]) {
							width: 4rem;
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
						.toolbar-button {
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
						.toolbar-button:hover {
							background: var(--vscode-toolbar-hoverBackground);
						}
						.toolbar-button.active {
							background: var(--vscode-toolbar-activeBackground);
							color: var(--vscode-toolbar-activeForeground);
						}
						.material-symbols-outlined {
							font-variation-settings:
								'FILL' 0,
								'wght' 400,
								'GRAD' 0,
								'opsz' 24
						}
					</style>
				</head>
				<body>
					<div id="preview">
						<!-- Preview will be inserted here -->
					</div>
					<div id="parameters">
						<!-- Parameter controls will be dynamically inserted here -->
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

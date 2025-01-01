import * as fs from "fs";
import * as vscode from "vscode";
import { ScadWatcher } from "./watcher";
import { ScadParameter } from "./types";
import { ParameterManager } from "./parameterManager";

export class PreviewPanel {
	private static currentPanel: PreviewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _watcher: ScadWatcher;
	private _parameterManager: ParameterManager;

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		scadUri: vscode.Uri
	) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Configure webview
		this._panel.webview.options = {
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
		this._parameterManager = new ParameterManager(() => {
			// Trigger re-render when parameters change
			this._watcher.renderWithParameters(
				this._parameterManager.getParameterArgs()
			);
		});

		// Set up watcher for SCAD file
		const scadPath = scadUri.fsPath;

		this._watcher = new ScadWatcher(
			(stlData) => {
				const base64Data = stlData.toString("base64");

				this._panel.webview.postMessage({
					type: "update",
					content: base64Data,
				});
			},
			(parameters) => {
				// Update parameter manager when new parameters are discovered
				this._parameterManager.updateDefinitions(parameters);
				// Update UI with current parameter values
				this._updateParameters(this._parameterManager.getParameters());
			}
		);

		this._watcher.watch(scadPath);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			(message) => {
				switch (message.type) {
					case "parameterChanged":
						const { name, value } = message;
						this._parameterManager.updateValue(name, value);
						return;
				}
			},
			null,
			this._disposables
		);

		// Clean up when panel is closed
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public static createOrShow(extensionUri: vscode.Uri, scadUri: vscode.Uri) {
		if (PreviewPanel.currentPanel) {
			PreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
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

		PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, scadUri);
	}

	private _updateParameters(parameters: ScadParameter[]) {
		this._panel.webview.postMessage({
			type: "updateParameters",
			parameters,
		});
	}

	private _updateWebview() {
		const webview = this._panel.webview;

		// Get path to compiled preview script
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "dist", "webview", "preview.js")
		);

		this._panel.webview.html = /* html */ `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>OpenSCAD Preview</title>
					<style>
						body { 
							margin: 0; 
							padding: 0;
							height: 100vh;
							display: flex;
						}
						#preview {
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
						}
						.parameter-group {
                            margin-bottom: 2rem;
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
                            margin-bottom: 0.5rem;
                        }
                        .parameter label {
                            display: block;
                            color: var(--vscode-foreground);
                        }
                        .parameter input {
                            background: var(--vscode-input-background);
                            color: var(--vscode-input-foreground);
                            border: 1px solid var(--vscode-input-border);
                            padding: 0.25rem;
                        }
						.parameter input:not([type="checkbox"]) {
							width: 5rem;
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
		PreviewPanel.currentPanel = undefined;
		this._watcher.close();
		this._panel.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}
	}
}

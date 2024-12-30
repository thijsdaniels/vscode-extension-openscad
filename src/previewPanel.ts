import * as fs from "fs";
import * as vscode from "vscode";
import { ScadWatcher } from "./watcher";

export class PreviewPanel {
	private static currentPanel: PreviewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _watcher: ScadWatcher;

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

		// Set up watcher for SCAD file
		const scadPath = scadUri.fsPath;

		this._watcher = new ScadWatcher((stlData) => {
			const base64Data = stlData.toString("base64");

			this._panel.webview.postMessage({
				type: "update",
				content: base64Data,
			});
		});

		this._watcher.watch(scadPath);

		// Clean up when panel is closed
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public static createOrShow(extensionUri: vscode.Uri, scadUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (PreviewPanel.currentPanel) {
			PreviewPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			"openscadPreview",
			"OpenSCAD Preview",
			column || vscode.ViewColumn.Two,
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
						body { margin: 0; }
						canvas { width: 100vw; height: 100vh; }
					</style>
				</head>
				<body>
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

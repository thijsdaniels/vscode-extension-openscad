import * as vscode from "vscode";

export function getWebviewHtml(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
): string {
	// Get path to compiled preview script
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, "dist", "webview.js"),
	);

	return /* html */ `
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
						flex-direction: column;
						overflow: hidden;
					}
					#content-container {
						display: flex;
						flex-direction: row;
						flex-grow: 1;
						min-height: 0;
					}
					#preview {
						position: relative;
						flex-grow: 1;
						min-width: 0;
						min-height: 0;
						overflow: hidden;
					}
					canvas { 
						width: 100%;
						height: 100%;
					}
					#parameters-panel {
						background: var(--vscode-panel-background);
						border-left: 1px solid var(--vscode-panel-border);
						display: flex;
						flex-direction: column;
						width: 300px;
						height: 100%;
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
					#toolbar-container {
						display: flex;
						justify-content: space-between;
						align-items: center;
						background: var(--vscode-panel-background);
						padding: 0.25rem;
						border-bottom: 1px solid var(--vscode-panel-border);
					}
					.toolbar-groups {
						display: flex;
						gap: 0.5rem;
						flex-grow: 1;
						justify-content: center;
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
				<div id="toolbar-container">
					<div id="toolbar-groups-mount"></div>
					<button id="toggle-parameters" class="icon-button material-symbols-outlined active" title="Toggle Parameters">
						view_sidebar
					</button>
				</div>
				<div id="content-container">
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
							<vscode-button id="export-button" style="width: 100%">Export Model</vscode-button>
						</div>
					</div>
				</div>
				<script src="${scriptUri}" type="module"></script>
			</body>
		</html>
	`;
}

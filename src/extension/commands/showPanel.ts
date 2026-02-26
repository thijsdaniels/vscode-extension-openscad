import * as vscode from "vscode";
import { OpenScadSessionManager } from "../core/OpenScadSessionManager";
import { ScadPreviewPanel } from "../views/ScadPreviewPanel";

// Keep track of active panels by URI to avoid opening duplicates
const activePanels = new Map<string, ScadPreviewPanel>();

export function registerShowPanelCommand(
	context: vscode.ExtensionContext,
	sessionManager: OpenScadSessionManager,
): vscode.Disposable {
	return vscode.commands.registerCommand("openscad.showPanel", () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const documentUri = editor.document.uri;
		const key = documentUri.toString();

		// If a panel is already open for this file, just reveal it
		if (activePanels.has(key)) {
			// There's currently no public API on ScadPreviewPanel to reveal,
			// but we can add one later if needed. For now, we just skip creating a duplicate.
			vscode.window.showInformationMessage(
				"Preview is already open for this file.",
			);
			return;
		}

		// Retrieve or create the long-lived session for this document
		const session = sessionManager.getOrCreateSession(documentUri);

		// Create the Webview tab
		const webviewPanel = vscode.window.createWebviewPanel(
			"openscadPreview",
			`OpenSCAD Preview: ${documentUri.path.split("/").pop()}`,
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				enableFindWidget: true,
				localResourceRoots: [
					vscode.Uri.joinPath(context.extensionUri, "dist"),
					vscode.Uri.joinPath(context.extensionUri, "node_modules", "three"),
				],
			},
		);

		// Instantiate our controller wrapper
		const scadPreviewPanel = new ScadPreviewPanel(
			webviewPanel,
			context.extensionUri,
			session,
		);

		activePanels.set(key, scadPreviewPanel);

		// When the user closes the Webview, clean up our map and tell the session manager
		webviewPanel.onDidDispose(() => {
			activePanels.delete(key);
			sessionManager.removeSession(documentUri);
		});
	});
}

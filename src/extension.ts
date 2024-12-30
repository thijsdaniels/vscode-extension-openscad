import * as vscode from "vscode";
import { PreviewPanel } from "./previewPanel";

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand(
		"openscad.showPreview",
		() => {
			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				return;
			}

			PreviewPanel.createOrShow(context.extensionUri, editor.document.uri);
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}

import * as vscode from "vscode";
import { ScadPanel } from "./ScadPanel";

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand("openscad.showPanel", () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		ScadPanel.createOrShow(context.extensionUri, editor.document.uri);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

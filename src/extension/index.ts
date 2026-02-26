import * as vscode from "vscode";
import { registerShowPanelCommand } from "./commands/showPanel";
import { OpenScadSessionManager } from "./core/OpenScadSessionManager";
import { OpenScadCli } from "./services/OpenScadCli";
import { ScadParser } from "./services/ScadParser";

let sessionManager: OpenScadSessionManager | undefined;

export function activate(context: vscode.ExtensionContext) {
	// 1. Initialize global utilities (Dependency Injection roots)
	const logger = vscode.window.createOutputChannel("OpenSCAD Preview");
	context.subscriptions.push(logger);

	// 2. Instantiate global services
	const cli = new OpenScadCli(logger);
	const parser = new ScadParser(logger);

	// 3. Create the centralized Session Manager
	sessionManager = new OpenScadSessionManager(cli, parser, logger);

	// 4. Register Commands
	const showPanelDisposable = registerShowPanelCommand(context, sessionManager);
	context.subscriptions.push(showPanelDisposable);

	// Additional future features (HoverProviders, Formatters) can be registered here
	// and provided the sessionManager if they need access to parsed parameters!
}

export function deactivate() {
	if (sessionManager) {
		sessionManager.dispose();
	}
}

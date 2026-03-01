import { ExtensionContext, window } from "vscode";
import { registerShowPanelCommand } from "./commands/showPanel";
import { ScadSessionManager } from "./core/ScadSessionManager";
import { ScadCli } from "./services/ScadCli";
import { ScadParser } from "./services/ScadParser";

let sessionManager: ScadSessionManager | undefined;

export function activate(context: ExtensionContext) {
  // 1. Initialize global utilities (Dependency Injection roots)
  const logger = window.createOutputChannel("OpenSCAD Preview");
  context.subscriptions.push(logger);

  // 2. Instantiate global services
  const cli = new ScadCli(logger);
  const parser = new ScadParser(logger);

  // 3. Create the centralized Session Manager
  sessionManager = new ScadSessionManager(cli, parser, logger);

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

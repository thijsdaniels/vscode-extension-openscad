import { OutputChannel, Uri } from "vscode";
import { OpenScadCli } from "../services/OpenScadCli";
import { ScadParser } from "../services/ScadParser";
import { OpenScadSession } from "./OpenScadSession";

/**
 * A centralized manager to track open document sessions.
 * Ensures we only have one parser/watcher running per file,
 * regardless of how many tabs or sidebars are viewing it.
 */
export class OpenScadSessionManager {
  private sessions = new Map<string, OpenScadSession>();

  constructor(
    private cli: OpenScadCli,
    private parser: ScadParser,
    private logger: OutputChannel,
  ) {}

  /**
   * Gets an existing session for a URI or creates a new one if it doesn't exist.
   */
  public getOrCreateSession(documentUri: Uri): OpenScadSession {
    const key = documentUri.toString();
    let session = this.sessions.get(key);

    if (!session) {
      this.logger.appendLine(`Creating new session for ${documentUri.fsPath}`);
      session = new OpenScadSession(
        documentUri,
        this.cli,
        this.parser,
        this.logger,
      );
      this.sessions.set(key, session);
    }

    return session;
  }

  /**
   * Disposes a completely closed session.
   */
  public removeSession(documentUri: Uri) {
    const key = documentUri.toString();
    const session = this.sessions.get(key);
    if (session) {
      session.dispose();
      this.sessions.delete(key);
      this.logger.appendLine(`Disposed session for ${documentUri.fsPath}`);
    }
  }

  public dispose() {
    for (const session of this.sessions.values()) {
      session.dispose();
    }
    this.sessions.clear();
  }
}

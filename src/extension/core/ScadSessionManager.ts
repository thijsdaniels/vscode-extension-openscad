import { OutputChannel, Uri } from "vscode";
import { ScadCli } from "../services/ScadCli";
import { ScadParser } from "../services/ScadParser";
import { ScadSession } from "./ScadSession";

/**
 * A centralized manager to track open document sessions. Ensures we only have
 * one parser/watcher running per file, regardless of how many tabs or sidebars
 * are viewing it.
 */
export class ScadSessionManager {
  private sessions = new Map<string, ScadSession>();

  constructor(
    private cli: ScadCli,
    private parser: ScadParser,
    private logger: OutputChannel,
  ) {}

  /**
   * Gets an existing session for a URI or creates a new one if it doesn't
   * exist.
   */
  public getOrCreateSession(documentUri: Uri): ScadSession {
    const key = documentUri.toString();
    let session = this.sessions.get(key);

    if (!session) {
      this.logger.appendLine(`Creating new session for ${documentUri.fsPath}`);
      session = new ScadSession(
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

import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";

const vscode = acquireVsCodeApi();

export type MessageCallback = (message: ExtensionToWebviewMessage) => void;

/**
 * Bridge handles all incoming messages from the VS Code extension host
 * and provides a centralized way to send messages back.
 */
export class Bridge {
  private callbacks: Set<MessageCallback> = new Set();

  constructor() {
    window.addEventListener("message", this.handleMessage);
  }

  public dispose() {
    window.removeEventListener("message", this.handleMessage);
    this.callbacks.clear();
  }

  public onMessage(callback: MessageCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public ready() {
    vscode.postMessage({ type: "ready" });
  }

  public updateParameterOverride(name: string, value: string | undefined) {
    vscode.postMessage({ type: "parameterChanged", name, value });
  }

  public exportModel() {
    vscode.postMessage({ type: "exportModel" });
  }

  public reportError(error: unknown) {
    console.error("[OpenSCAD Preview]", error);
    vscode.postMessage({
      type: "error",
      message: error?.toString(),
    });
  }

  private handleMessage = (event: MessageEvent) => {
    const message = event.data as ExtensionToWebviewMessage;
    this.callbacks.forEach((cb) => cb(message));
  };
}

// Export a singleton instance
export const bridge = new Bridge();

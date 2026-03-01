import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-debug": Debug;
  }
}

@customElement("scad-debug")
export class Debug extends LitElement {
  public static styles = css`
    :host {
      display: flex;
      height: 100%;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: var(--vscode-panel-background);
      border-top: 1px solid var(--vscode-panel-border);
    }
  `;

  render() {
    return html`DEBUG`;
  }
}

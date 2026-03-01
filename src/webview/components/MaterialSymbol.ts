import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "material-symbol": MaterialSymbol;
  }
}

@customElement("material-symbol")
export class MaterialSymbol extends LitElement {
  @property({ type: String }) name!: string;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* We need to import the font inside the shadow DOM for the icons to work */
    @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");
    .material-symbols-outlined {
      font-family: "Material Symbols Outlined";
      font-size: 1rem;
      font-weight: normal;
      font-style: normal;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-flex;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: "liga";
      -webkit-font-smoothing: antialiased;
    }
  `;

  render() {
    return html` <span class="material-symbols-outlined">${this.name}</span> `;
  }
}

import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

// Export the supported icons as a union type for strong typing
export type SupportedIcon =
  | "visibility"
  | "deployed_code"
  | "grid_off"
  | "grid_on"
  | "square"
  | "texture"
  | "opacity"
  | "language"
  | "palette"
  | "format_color_reset"
  | "circle"
  | "ev_shadow"
  | "view_sidebar"
  | "undo";

@customElement("scad-icon")
export class ScadIcon extends LitElement {
  @property({ type: String }) icon: SupportedIcon | string = "";

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
    return html` <span class="material-symbols-outlined">${this.icon}</span> `;
  }
}

import { provide } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ExtensionToWebviewMessage } from "../../shared/types/messages";
import { modelContext, ModelState } from "../contexts/ModelContext";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import {
  CameraMode,
  ColorMode,
  Environment,
  RenderMode,
  ShadowMode,
  viewSettingsContext,
  ViewSettingsContext,
} from "../contexts/ViewSettingsContext";
import { bridge } from "../services/Bridge";

@customElement("scad-app")
export class PreviewApp extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    .main-content {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    #toolbar-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-panel-background);
      padding: 0.25rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .icon-button {
      background: none;
      border: none;
      color: var(--vscode-foreground);
      padding: 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .icon-button.active {
      background: var(--vscode-toolbar-activeBackground);
      color: var(--vscode-toolbar-activeForeground);
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
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: "liga";
      -webkit-font-smoothing: antialiased;
    }
  `;

  @state()
  private isParametersVisible: boolean = true;

  @provide({ context: viewSettingsContext })
  @state()
  viewSettings: ViewSettingsContext = {
    settings: {
      surface: Environment.Grid,
      renderMode: RenderMode.Solid,
      camera: CameraMode.Perspective,
      shadows: ShadowMode.On,
      colors: ColorMode.On,
    },
    get: (key) => this.viewSettings.settings[key],
    is: (key, value) => this.viewSettings.settings[key] === value,
    set: (key, value) => {
      this.viewSettings = {
        ...this.viewSettings,
        settings: {
          ...this.viewSettings.settings,
          [key]: value,
        },
      };
    },
  };

  @provide({ context: parameterContext })
  @state()
  parameterState: ParameterContext = {
    parameters: [],
    overrides: {},
    get: (name) => this.parameterState.parameters.find((p) => p.name === name),
    override: (name, value) => {
      bridge.updateParameterOverride(name, value?.toString());
    },
    revert: (name) => {
      bridge.updateParameterOverride(name, undefined);
    },
  };

  @provide({ context: modelContext })
  @state()
  modelState: ModelState = {
    format: null,
    base64Data: null,
    exportModel: () => bridge.exportModel(),
  };

  private unsubscribeMessage: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeMessage = bridge.onMessage(this.handleMessage);
    bridge.ready();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeMessage) {
      this.unsubscribeMessage();
    }
  }

  private handleMessage = (message: ExtensionToWebviewMessage) => {
    switch (message.type) {
      case "update":
        if (message.content) {
          this.modelState = {
            format: message.format === "3mf" ? "3mf" : "stl",
            base64Data: message.content,
            exportModel: () => bridge.exportModel(),
          };
        } else {
          bridge.reportError("No content in update message");
        }
        break;
      case "updateParameters":
        if (message.parameters) {
          this.parameterState = {
            ...this.parameterState,
            parameters: message.parameters,
            overrides: message.overrides || {},
          };
        } else {
          bridge.reportError("No parameters in update message");
        }
        break;
    }
  };

  private toggleParameters() {
    this.isParametersVisible = !this.isParametersVisible;
  }

  render() {
    return html`
      <div id="toolbar-container">
        <scad-toolbar></scad-toolbar>
        <button
          id="toggle-parameters"
          class="icon-button material-symbols-outlined ${this
            .isParametersVisible
            ? "active"
            : ""}"
          title="Toggle Parameters"
          @click=${this.toggleParameters}
        >
          view_sidebar
        </button>
      </div>
      <div class="main-content">
        <scad-canvas></scad-canvas>
        <scad-parameter-controls
          style="display: ${this.isParametersVisible ? "flex" : "none"}"
        ></scad-parameter-controls>
      </div>
    `;
  }
}

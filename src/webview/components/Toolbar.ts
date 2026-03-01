import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ModelContext, modelContext } from "../contexts/ModelContext";
import { PanelContext, panelContext } from "../contexts/PanelContext";
import {
  CameraMode,
  ColorMode,
  Environment,
  RenderMode,
  ShadowMode,
  ViewSettings,
  ViewSettingsContext,
  viewSettingsContext,
} from "../contexts/ViewSettingsContext";
import "./MaterialSymbol";

interface ToolbarButton<T extends string> {
  states: T[];
  icons: Record<T, string>;
  defaultState: T;
}

type ViewSettingsButtons = {
  [K in keyof ViewSettings]: ToolbarButton<ViewSettings[K]>;
};

const viewSettingsButtons: ViewSettingsButtons = {
  camera: {
    states: [CameraMode.Perspective, CameraMode.Orthographic],
    icons: {
      [CameraMode.Perspective]: "visibility",
      [CameraMode.Orthographic]: "deployed_code",
    },
    defaultState: CameraMode.Perspective,
  },
  surface: {
    states: [Environment.None, Environment.Grid, Environment.BuildPlate],
    icons: {
      [Environment.None]: "grid_off",
      [Environment.Grid]: "grid_on",
      [Environment.BuildPlate]: "square",
    },
    defaultState: Environment.Grid,
  },
  renderMode: {
    states: [RenderMode.Solid, RenderMode.XRay, RenderMode.Wireframe],
    icons: {
      [RenderMode.Solid]: "texture",
      [RenderMode.XRay]: "opacity",
      [RenderMode.Wireframe]: "language",
    },
    defaultState: RenderMode.Solid,
  },
  colors: {
    states: [ColorMode.On, ColorMode.Off],
    icons: {
      [ColorMode.On]: "palette",
      [ColorMode.Off]: "format_color_reset",
    },
    defaultState: ColorMode.On,
  },
  shadows: {
    states: [ShadowMode.Off, ShadowMode.On],
    icons: {
      [ShadowMode.Off]: "circle",
      [ShadowMode.On]: "ev_shadow",
    },
    defaultState: ShadowMode.On,
  },
};

@customElement("scad-toolbar")
export class PreviewToolbar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem;
      background: var(--vscode-panel-background);
      border-right: 1px solid var(--vscode-panel-border);
    }

    .toolbar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .toolbar-segment {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .segment-button {
      border: 1px solid var(--vscode-input-border);
      border-bottom: none;
      background: transparent;
      color: var(--vscode-toolbar-foreground);
      padding: 0.25rem;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .segment-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .segment-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .segment-button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .segment-button.active {
      background: var(--vscode-toolbar-activeBackground);
      color: var(--vscode-toolbar-activeForeground);
    }

    .segment-button.primary.active {
      background: var(--vscode-button-activeBackground);
      color: var(--vscode-button-activeForeground);
    }

    .segment-button.first {
      border-radius: 0.25rem 0.25rem 0 0;
    }

    .segment-button.last {
      border-radius: 0 0 0.25rem 0.25rem;
      border-bottom: 1px solid var(--vscode-input-border);
    }
  `;

  @consume({ context: panelContext, subscribe: true })
  @state()
  panelContext!: PanelContext;

  @consume({ context: viewSettingsContext, subscribe: true })
  @state()
  viewSettings!: ViewSettingsContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  modelContext!: ModelContext;

  render() {
    return html`
      <toolbar-section>
        <div class="toolbar-segment">
          <button
            class=${classMap({
              "segment-button": true,
              primary: true,
              first: true,
              last: true,
            })}
            title="Export"
            @click=${() => this.modelContext.export()}
          >
            <material-symbol name="file_save"></material-symbol>
          </button>
        </div>
      </toolbar-section>
      <div class="toolbar-section">
        ${mapObject(viewSettingsButtons, ([key, button]) => {
          return html`
            <div class="toolbar-segment">
              ${button.states.map((state, index) => {
                const currentValue = this.viewSettings.get(key);
                const isActive = currentValue === state;

                return html`
                  <button
                    class=${classMap({
                      "segment-button": true,
                      first: index === 0,
                      last: index === button.states.length - 1,
                      active: isActive,
                    })}
                    title=${`${key}: ${state}`}
                    @click=${() => this.viewSettings.set(key, state)}
                  >
                    <material-symbol
                      name=${button.icons[state as keyof typeof button.icons]}
                    ></material-symbol>
                  </button>
                `;
              })}
            </div class="toolbar-segment">
          `;
        })}
      </div>
      <div class="toolbar-section">
        <div class="toolbar-segment">
          <button
            class=${classMap({
              "segment-button": true,
              first: true,
              active: this.panelContext.panels.parameters,
            })}
            title="Toggle Right Panel"
            @click=${() => this.panelContext.toggle("parameters")}
          >
            <material-symbol name="settings"></material-symbol>
          </button>
          <button
            class=${classMap({
              "segment-button": true,
              last: true,
              active: this.panelContext.panels.debug,
            })}
            title="Toggle Bottom Panel"
            @click=${() => this.panelContext.toggle("debug")}
          >
            <material-symbol name="code"></material-symbol>
          </button>
        </div>
      </div>
    `;
  }
}

function mapObject<K extends string, V, O extends Record<K, V>, R>(
  obj: O,
  fn: ([key, value]: [keyof O, O[keyof O]]) => R,
): R[] {
  return Object.entries(obj).map(([key, value]) =>
    fn([key as keyof O, value as O[keyof O]]),
  );
}

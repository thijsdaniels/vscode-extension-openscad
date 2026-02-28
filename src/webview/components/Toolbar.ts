import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
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
import "./Icon";

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
      gap: 0.5rem;
    }

    .segment-group {
      display: flex;
      margin: 0 4px;
    }

    .segment-button {
      border: 1px solid var(--vscode-input-border);
      border-right: none;
      background: transparent;
      color: #888;
      padding: 4px 8px;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .segment-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .segment-button.active {
      background: var(--vscode-toolbar-activeBackground);
      color: var(--vscode-toolbar-activeForeground);
    }

    .segment-button.first {
      border-radius: 4px 0 0 4px;
    }

    .segment-button.last {
      border-radius: 0 4px 4px 0;
      border-right: 1px solid var(--vscode-input-border);
    }
  `;

  @consume({ context: viewSettingsContext, subscribe: true })
  @state()
  viewSettings!: ViewSettingsContext;

  render() {
    if (!this.viewSettings) {
      return html`<div>Loading...</div>`;
    }

    return html`
      ${mapObject(viewSettingsButtons, ([key, button]) => {
        return html`
          <div class="segment-group">
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
                  <scad-icon
                    icon=${button.icons[state as keyof typeof button.icons]}
                  ></scad-icon>
                </button>
              `;
            })}
          </div>
        `;
      })}
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

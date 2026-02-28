import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import { modelContext, ModelState } from "../contexts/ModelContext";
import { ScadParameter } from "../../shared/types/parameters";
import "./Icon";

@customElement("scad-parameter-controls")
export class ParameterControls extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 240px;
      height: 100%;
      background: var(--vscode-sideBar-background);
      border-left: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }

    .parameters {
      flex-grow: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .export-container {
      padding: 16px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    h3 {
      font-size: 14px;
      margin: 0 0 12px 0;
      color: var(--vscode-sideBarSectionHeader-foreground);
    }

    .parameter-group {
      margin-bottom: 24px;
    }

    .parameter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .parameter label {
      font-size: 12px;
    }

    .input-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    vscode-text-field {
      width: 100%;
    }

    .button.revert {
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }

    .button.revert:hover {
      opacity: 1;
      color: var(--vscode-foreground);
    }
  `;

  @consume({ context: parameterContext, subscribe: true })
  @state()
  parameterState!: ParameterContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  modelState!: ModelState;

  private formatParameterName(paramName: string, groupName: string): string {
    const words = paramName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ");

    if (
      words.length > 1 &&
      words[0].toLowerCase() === groupName.toLowerCase()
    ) {
      words.shift();
    }

    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  private handleInputChange(name: string, value: unknown) {
    if (this.parameterState.override) {
      this.parameterState.override(name, value as string);
    }
  }

  private renderInput(param: ScadParameter, currentValue: any) {
    switch (param.type) {
      case "boolean":
        return html`
          <vscode-checkbox
            .checked=${currentValue}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                (e.target as HTMLInputElement).checked,
              )}
          ></vscode-checkbox>
        `;
      case "number":
        return html`
          <vscode-text-field
            size="3"
            .value=${currentValue?.toString()}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                parseFloat((e.target as HTMLInputElement).value),
              )}
          ></vscode-text-field>
        `;
      case "string":
        return html`
          <vscode-text-field
            size="3"
            .value=${currentValue}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                (e.target as HTMLInputElement).value,
              )}
          ></vscode-text-field>
        `;
      default:
        return nothing;
    }
  }

  private handleExport() {
    this.modelState?.exportModel?.();
  }

  render() {
    if (!this.parameterState || !this.parameterState.parameters.length) {
      return html`
        <div class="parameters"><div>No parameters available.</div></div>
        <div class="export-container">
          <vscode-button style="width: 100%" @click=${this.handleExport}
            >Export Model</vscode-button
          >
        </div>
      `;
    }

    const { parameters, overrides } = this.parameterState;
    const groups = new Map<string, ScadParameter[]>();

    parameters.forEach((param) => {
      // Cast parameter to the more complete shared type
      const scadParam = param as unknown as ScadParameter;
      const group = scadParam.group || "Parameters";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)?.push(scadParam);
    });

    return html`
      <div class="parameters">
        ${Array.from(groups.entries()).map(
          ([groupName, params]) => html`
            <div class="parameter-group">
              <h3>${groupName}</h3>
              ${params.map((param) => {
                const isOverridden = param.name in overrides;
                const currentValue = isOverridden
                  ? overrides[param.name]
                  : param.value;

                return html`
                  <div class="parameter">
                    <label
                      >${this.formatParameterName(param.name, groupName)}</label
                    >
                    <div class="input-container">
                      ${isOverridden
                        ? html`
                            <scad-icon
                              class="button revert"
                              icon="undo"
                              title="Revert to default: ${param.value}"
                              @click=${() =>
                                this.handleInputChange(param.name, undefined)}
                            ></scad-icon>
                          `
                        : nothing}
                      ${this.renderInput(param, currentValue)}
                    </div>
                  </div>
                `;
              })}
            </div>
          `,
        )}
      </div>
      <div class="export-container">
        <vscode-button style="width: 100%" @click=${this.handleExport}
          >Export Model</vscode-button
        >
      </div>
    `;
  }
}

import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ScadParameter } from "../../shared/types/ScadParameter";
import { ModelContext, modelContext } from "../contexts/ModelContext";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import "./MaterialSymbol";
import "./ScadNumberfield";

declare global {
  interface HTMLElementTagNameMap {
    "scad-parameters": Parameters;
  }
}

@customElement("scad-parameters")
export class Parameters extends LitElement {
  public static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--vscode-panel-background);
      border-left: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }

    .parameter-set-container {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .parameter-set-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .parameter-set-controls vscode-single-select {
      flex: 1;
    }

    .parameter-set-actions {
      display: flex;
      gap: 0.25rem;
    }

    .parameters {
      padding: 0.5rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .parameters-inner {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .panel-heading {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--vscode-panelTitle-foreground);
      margin-bottom: 0.5rem;
    }

    .parameter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .parameter-label-container {
      width: 50%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .parameter-label {
      font-size: 12px;
    }

    .parameter-label--overridden {
      font-weight: bold;
    }

    .input-container {
      width: 50%;
    }

    vscode-textfield {
      width: 100%;
    }

    vscode-single-select {
      width: 100%;
    }

    .export-container {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.75rem;
      border-top: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      margin-top: auto;
    }

    .export-container vscode-button {
      flex: 1;
    }
  `;

  @property({ type: Boolean })
  public open = false;

  @consume({ context: modelContext, subscribe: true })
  @state()
  private modelContext!: ModelContext;

  @consume({ context: parameterContext, subscribe: true })
  @state()
  private parameterContext!: ParameterContext;

  public render() {
    const { parameters, overrides, parameterSets, activeSetName } =
      this.parameterContext;

    const groups = this.groupParameters(parameters);
    const setNames = Object.keys(parameterSets || {});

    return html`
      <div class="parameter-set-container">
        <span class="panel-heading">Preset</span class="panel-heading">
        <div class="parameter-set-controls">
          <vscode-single-select
            .value=${activeSetName || ""}
            @change=${(e: Event) => {
              const val = (e.target as HTMLSelectElement).value;
              this.parameterContext.applySet(val ? val : undefined);
            }}
          >
            <vscode-option value="">None</vscode-option>
            ${setNames.map(
              (name) =>
                html`<vscode-option value="${name}">${name}</vscode-option>`,
            )}
          </vscode-single-select>
          <div class="parameter-set-actions">
            ${
              activeSetName
                ? html`
                    <vscode-toolbar-button
                      icon="save"
                      title="Save Active Preset"
                      @click=${() =>
                        this.parameterContext.saveSet(activeSetName)}
                    ></vscode-toolbar-button>
                    <vscode-toolbar-button
                      icon="trash"
                      title="Delete Active Preset"
                      @click=${() =>
                        this.parameterContext.deleteSet(activeSetName)}
                    ></vscode-toolbar-button>
                  `
                : nothing
            }
            <vscode-toolbar-button
              icon="save-as"
              title="Save as New Preset"
              @click=${() => this.parameterContext.saveAsNewSet()}
            ></vscode-toolbar-button>
          </div>
        </div>
      </div>
      ${Array.from(groups.entries()).map(
        ([groupName, parameters]) => html`
          <vscode-collapsible class="parameters" heading="${groupName}" open>
            <div class="parameters-inner">
              ${parameters.map((parameter) => {
                const isOverridden = parameter.name in overrides;
                const currentValue = this.getCompoundValue(parameter);

                return html`
                  <div class="parameter">
                    <div class="parameter-label-container">
                      <label
                        title="${parameter.description}"
                        class=${classMap({
                          "parameter-label": true,
                          "parameter-label--overridden": isOverridden,
                        })}
                      >
                        ${this.formatParameterName(parameter.name, groupName)}
                      </label>
                      ${isOverridden
                        ? html`
                            <vscode-toolbar-button
                              icon="discard"
                              title="Revert"
                              @click=${() =>
                                this.handleInputChange(
                                  parameter.name,
                                  undefined,
                                )}
                            ></vscode-toolbar-button>
                          `
                        : nothing}
                    </div>
                    <div class="input-container">
                      ${this.renderInput(parameter, currentValue)}
                    </div>
                  </div>
                `;
              })}
            </div>
          </vscode-collapsible>
        `,
      )}
      <div class="export-container">
        <vscode-button
          
          title="Send Model to 3D Slicer"
          @click=${() => this.modelContext.sendToSlicer()}
        >
          Print
        </vscode-button>
        <vscode-button
          
          title="Write Model to File System"
          @click=${() => this.modelContext.export()}
        >
          Export
        </vscode-button>
      </div>
    `;
  }

  private groupParameters(parameters: ScadParameter[]) {
    const groups = new Map<string, ScadParameter[]>();

    parameters.forEach((parameter) => {
      const group = parameter.group || "Parameters";

      if (!groups.has(group)) {
        groups.set(group, []);
      }

      groups.get(group)?.push(parameter);
    });

    return groups;
  }

  private formatParameterName(paramName: string, groupName: string): string {
    const name = paramName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/\s+/g, " ")
      .replace(new RegExp(`^${groupName}`, "i"), "");

    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  private getCompoundValue(param: ScadParameter): string | number | boolean {
    const { parameterSets, activeSetName, overrides } = this.parameterContext;
    if (param.name in overrides) {
      return overrides[param.name];
    }
    if (
      activeSetName &&
      parameterSets &&
      parameterSets[activeSetName] &&
      param.name in parameterSets[activeSetName]
    ) {
      const rawStr = parameterSets[activeSetName][param.name];
      if (typeof param.value === "number") return Number(rawStr);
      if (typeof param.value === "boolean") return rawStr === "true";
      return rawStr;
    }
    return param.value;
  }

  private handleInputChange(name: string, value: unknown) {
    if (this.parameterContext.override) {
      this.parameterContext.override(name, value as string | number | boolean);
    }
  }

  private renderInput(param: ScadParameter, currentValue: unknown) {
    if (param.type === "string" && "options" in param && param.options) {
      return html`
        <vscode-single-select
          .value=${currentValue}
          @change=${(e: Event) =>
            this.handleInputChange(
              param.name,
              (e.target as HTMLSelectElement).value,
            )}
        >
          ${param.options.map(
            (opt) => html`
              <vscode-option value="${opt.value}"
                >${opt.label || opt.value}</vscode-option
              >
            `,
          )}
        </vscode-single-select>
      `;
    }

    if (param.type === "number" && "options" in param && param.options) {
      return html`
        <vscode-single-select
          .value=${currentValue?.toString()}
          @change=${(e: Event) =>
            this.handleInputChange(
              param.name,
              parseFloat((e.target as HTMLSelectElement).value),
            )}
        >
          ${param.options.map(
            (opt) => html`
              <vscode-option value="${opt.value}"
                >${opt.label || opt.value}</vscode-option
              >
            `,
          )}
        </vscode-single-select>
      `;
    }

    switch (param.type) {
      case "boolean":
        return html`
          <vscode-checkbox
            ?indeterminate=${false}
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
          <scad-numberfield
            .value=${typeof currentValue === "number"
              ? currentValue
              : Number(currentValue) || param.min || 0}
            .min=${param.min}
            .max=${param.max}
            .step=${param.step}
            @change=${(e: CustomEvent) =>
              this.handleInputChange(param.name, e.detail.value)}
          ></scad-numberfield>
        `;
      case "string":
        return html`
          <vscode-textfield
            size="3"
            .value=${currentValue}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                (e.target as HTMLInputElement).value,
              )}
          ></vscode-textfield>
        `;
      default:
        return nothing;
    }
  }
}

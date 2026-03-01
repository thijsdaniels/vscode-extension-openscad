import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ScadParameter } from "../../shared/types/ScadParameter";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import "./MaterialSymbol";

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
      width: 50%;
    }

    .input-container {
      width: 50%;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    vscode-textfield {
      width: 100%;
    }
  `;

  @property({ type: Boolean })
  public open = false;

  @consume({ context: parameterContext, subscribe: true })
  @state()
  private parameterContext!: ParameterContext;

  public render() {
    const { parameters, overrides } = this.parameterContext;

    const groups = this.groupParameters(parameters);

    return html`
      <div class="parameters">
        ${Array.from(groups.entries()).map(
          ([groupName, parameters]) => html`
            <div class="parameter-group">
              <h3>${groupName}</h3>
              ${parameters.map((parameter) => {
                const isOverridden = parameter.name in overrides;
                const currentValue = isOverridden
                  ? overrides[parameter.name]
                  : parameter.value;

                return html`
                  <div class="parameter">
                    <label>
                      ${this.formatParameterName(parameter.name, groupName)}
                    </label>
                    <div class="input-container">
                      ${this.renderInput(parameter, currentValue)}
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
                  </div>
                `;
              })}
            </div>
          `,
        )}
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

  private handleInputChange(name: string, value: unknown) {
    if (this.parameterContext.override) {
      this.parameterContext.override(name, value as string);
    }
  }

  private renderInput(param: ScadParameter, currentValue: unknown) {
    switch (param.type) {
      case "boolean":
        return html`
          <vscode-checkbox
            toggle
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
          <vscode-textfield
            size="3"
            .value=${currentValue?.toString()}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                parseFloat((e.target as HTMLInputElement).value),
              )}
          ></vscode-textfield>
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

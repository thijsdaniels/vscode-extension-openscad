import { ScadParameter } from "../../shared/types/ScadParameter";

export class ScadParameters {
  private parameters: Map<string, ScadParameter> = new Map();
  private overrides: Map<string, string | number | boolean> = new Map();
  private onChangeCallback?: () => void;

  constructor(onChangeCallback?: () => void) {
    this.onChangeCallback = onChangeCallback;
  }

  updateDefinitions(newParameters: ScadParameter[]) {
    this.parameters.clear();
    newParameters.forEach((param) => {
      this.parameters.set(param.name, param);
    });

    // Remove overrides for parameters that no longer exist
    for (const [name] of this.overrides) {
      if (!this.parameters.has(name)) {
        this.overrides.delete(name);
      }
    }
  }

  updateValue(name: string, value: string | number | boolean | undefined) {
    if (value === null || value === undefined) {
      this.overrides.delete(name);
    } else {
      this.overrides.set(name, value);
    }
    this.onChangeCallback?.();
  }

  getParameters(): ScadParameter[] {
    return Array.from(this.parameters.values());
  }

  getOverrides(): Record<string, string | number | boolean> {
    return Object.fromEntries(this.overrides);
  }

  getParameterArgs(): string[] {
    const args: string[] = [];
    for (const param of this.parameters.values()) {
      const value = this.overrides.has(param.name)
        ? this.overrides.get(param.name)
        : param.value;
      args.push("--D", `${param.name}=${value}`);
    }
    return args;
  }
}

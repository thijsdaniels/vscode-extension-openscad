import { ScadParameter } from "../../shared/types/ScadParameter";

/**
 * Keeps a reference to the parameters of a SCAD document, as well as a set of
 * optional overrides for those parameters.
 */
export class ScadParameters {
  private parameters: Map<string, ScadParameter> = new Map();
  private overrides: Map<string, string | number | boolean> = new Map();
  private onChange?: (event: {
    parameters: ScadParameter[];
    overrides: Record<string, string | number | boolean>;
  }) => void;

  constructor({
    onChange,
  }: {
    onChange?: (event: {
      parameters: ScadParameter[];
      overrides: Record<string, string | number | boolean>;
    }) => void;
  } = {}) {
    this.onChange = onChange;
  }

  /**
   * Call this to update the original parameter definitions, for example after
   * the SCAD file has been changed.
   *
   * Re-evaluates overrides to drop any that no longer exist in the new definitions.
   */
  public updateDefinitions(newParameters: ScadParameter[]) {
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

    this.onChange?.({
      parameters: this.getParameters(),
      overrides: this.getOverrides(),
    });
  }

  /**
   * Call this to override a parameter value, or to revert back to the original
   * value for a parameter.
   */
  public updateValue(
    name: string,
    value: string | number | boolean | undefined,
  ) {
    if (value === null || value === undefined) {
      this.overrides.delete(name);
    } else {
      this.overrides.set(name, value);
    }

    this.onChange?.({
      parameters: this.getParameters(),
      overrides: this.getOverrides(),
    });
  }

  public getParameters(): ScadParameter[] {
    return Array.from(this.parameters.values());
  }

  public getOverrides(): Record<string, string | number | boolean> {
    return Object.fromEntries(this.overrides);
  }

  /**
   * Returns a merged record of the active parameter values,
   * combining default values with any updated overrides.
   */
  public getActiveValues(): Record<string, string | number | boolean> {
    const active: Record<string, string | number | boolean> = {};

    for (const param of this.parameters.values()) {
      active[param.name] = this.overrides.has(param.name)
        ? this.overrides.get(param.name)!
        : param.value;
    }

    return active;
  }
}

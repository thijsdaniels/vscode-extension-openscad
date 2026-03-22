import { ScadParameter } from "../../shared/types/ScadParameter";

/**
 * Keeps a reference to the parameters of a SCAD document, as well as a set of
 * optional overrides for those parameters.
 */
export class ScadParameters {
  private parameters: Map<string, ScadParameter> = new Map();
  private parameterSets: Record<string, Record<string, string>> = {};
  private activeSetName: string | undefined = undefined;
  private overrides: Map<string, string | number | boolean> = new Map();
  private onChange?: (event: {
    parameters: ScadParameter[];
    parameterSets: Record<string, Record<string, string>>;
    activeSetName: string | undefined;
    overrides: Record<string, string | number | boolean>;
  }) => void;

  constructor({
    onChange,
  }: {
    onChange?: (event: {
      parameters: ScadParameter[];
      parameterSets: Record<string, Record<string, string>>;
      activeSetName: string | undefined;
      overrides: Record<string, string | number | boolean>;
    }) => void;
  } = {}) {
    this.onChange = onChange;
  }

  private fireChange() {
    this.onChange?.({
      parameters: this.getParameters(),
      parameterSets: this.parameterSets,
      activeSetName: this.activeSetName,
      overrides: this.getOverrides(),
    });
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

    this.fireChange();
  }

  public updateParameterSets(sets: Record<string, Record<string, string>>) {
    this.parameterSets = sets;
    this.fireChange();
  }

  public getParameterSets(): Record<string, Record<string, string>> {
    return this.parameterSets;
  }

  public setActiveSet(name: string | undefined) {
    this.activeSetName = name;
    this.overrides.clear();
    
    if (name && this.parameterSets[name]) {
      const setValues = this.parameterSets[name];
      for (const param of this.parameters.values()) {
        if (param.name in setValues) {
          const rawStr = setValues[param.name];
          if (typeof param.value === "number") {
             this.overrides.set(param.name, parseFloat(rawStr));
          } else if (typeof param.value === "boolean") {
             this.overrides.set(param.name, rawStr === "true");
          } else {
             this.overrides.set(param.name, rawStr);
          }
        }
      }
    }
    
    this.fireChange();
  }

  public getActiveSetName(): string | undefined {
    return this.activeSetName;
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

    this.fireChange();
  }

  public getParameters(): ScadParameter[] {
    return Array.from(this.parameters.values());
  }

  public getOverrides(): Record<string, string | number | boolean> {
    return Object.fromEntries(this.overrides);
  }

  /**
   * Returns a merged record of the active parameter values,
   * combining default values exclusively with the flat active overrides map.
   */
  public getActiveValues(): Record<string, string | number | boolean> {
    const active: Record<string, string | number | boolean> = {};

    for (const param of this.parameters.values()) {
      if (this.overrides.has(param.name)) {
        active[param.name] = this.overrides.get(param.name)!;
      } else {
        active[param.name] = param.value;
      }
    }

    return active;
  }

  /**
   * Calculates a partial record of active values to save. 
   * In the flat model, this is simply a direct string serialization of all explicit edits in the overrides bucket,
   * protecting against future SCAD default value mutations.
   */
  public calculateActiveSetPartial(): Record<string, string> {
    const partial: Record<string, string> = {};
    for (const [name, value] of this.overrides) {
      partial[name] = value.toString();
    }
    return partial;
  }
}

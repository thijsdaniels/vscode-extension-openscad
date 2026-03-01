interface ParameterMetadata {
  name: string;
  description?: string;
  group?: string;
}

export interface NumericParameter extends ParameterMetadata {
  type: "number";
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface BooleanParameter extends ParameterMetadata {
  type: "boolean";
  value: boolean;
}

export interface StringParameter extends ParameterMetadata {
  type: "string";
  value: string;
  options?: string[];
}

export type ScadParameter =
  | NumericParameter
  | BooleanParameter
  | StringParameter;

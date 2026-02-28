import { createContext } from "@lit/context";

export interface ParameterMetadata {
  name: string;
  description?: string;
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

export type Parameter = NumericParameter | BooleanParameter | StringParameter;

export type ParameterContext = {
  parameters: Parameter[];
  overrides: Record<Parameter["name"], Parameter["value"]>;
  get: (name: Parameter["name"]) => Parameter | undefined;
  override: (name: Parameter["name"], value: Parameter["value"]) => void;
  revert: (name: Parameter["name"]) => void;
};

export const parameterContext = createContext<ParameterContext>("parameters");

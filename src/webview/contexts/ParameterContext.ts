import { createContext } from "@lit/context";
import { ScadParameter } from "../../shared/types/ScadParameter";

export type ParameterContext = {
  parameters: ScadParameter[];
  overrides: Record<ScadParameter["name"], ScadParameter["value"]>;
  get: (name: ScadParameter["name"]) => ScadParameter | undefined;
  override: (
    name: ScadParameter["name"],
    value: ScadParameter["value"],
  ) => void;
  revert: (name: ScadParameter["name"]) => void;
};

export const parameterContext = createContext<ParameterContext>("parameters");

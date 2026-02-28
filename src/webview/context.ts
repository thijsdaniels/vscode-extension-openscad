import { createContext } from "@lit/context";
import { RenderMode, Surface } from "./components/Toolbar";

export interface ViewSettingsState {
  surfaces: Surface;
  renderMode: RenderMode;
  orthographic: boolean;
  shadows: boolean;
  colors: boolean;
  updateSetting: <K extends keyof Omit<ViewSettingsState, "updateSetting">>(
    key: K,
    value: ViewSettingsState[K],
  ) => void;
}

export const viewSettingsContext =
  createContext<ViewSettingsState>("view-settings");

export interface Parameter {
  name: string;
  type: string;
  value: string;
  min?: string;
  max?: string;
  step?: string;
  options?: string[];
  description?: string;
}

export interface ParameterState {
  parameters: Parameter[];
  overrides: Record<string, string>;
  updateOverride: (
    name: string,
    value: string | number | boolean | undefined,
  ) => void;
}

export const parameterContext = createContext<ParameterState>("parameters");

export interface ModelState {
  format: "stl" | "3mf" | null;
  base64Data: string | null;
  exportModel: () => void;
}

export const modelContext = createContext<ModelState>("model");

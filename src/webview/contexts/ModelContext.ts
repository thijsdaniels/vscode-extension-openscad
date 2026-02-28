import { createContext } from "@lit/context";

export interface ModelState {
  format: "stl" | "3mf" | null;
  base64Data: string | null;
  exportModel: () => void;
}

export const modelContext = createContext<ModelState>("model");

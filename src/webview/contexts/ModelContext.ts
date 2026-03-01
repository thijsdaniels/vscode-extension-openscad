import { createContext } from "@lit/context";
import { ModelFormat } from "../../shared/types/ModelFormat";

export interface ModelContext {
  format: ModelFormat | null;
  base64Data: string | null;
  export: () => void;
}

export const modelContext = createContext<ModelContext>("model");

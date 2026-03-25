import { createContext } from "@lit/context";
import { ModelFormat } from "../../shared/types/ModelFormat";

export interface ModelContext {
  format: ModelFormat | null;
  base64Data: string | null;
  isLoading: boolean;
  loadingMessage: string;
  export: () => void;
  sendToSlicer: () => void;
}

export const modelContext = createContext<ModelContext>("model");

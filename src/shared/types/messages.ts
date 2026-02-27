import { ScadParameter } from "./parameters";

export type ExtensionToWebviewMessage =
  | { type: "ready" }
  | { type: "loadingState"; loading: boolean; message?: string }
  | { type: "update"; content: string; format: "3mf" | "stl" } // base64 payload
  | {
      type: "updateParameters";
      parameters: ScadParameter[];
      overrides: Record<string, any>;
    }
  | { type: "error"; message: string };

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "parameterChanged"; name: string; value: any }
  | { type: "exportModel" }
  | { type: "error"; message: string };

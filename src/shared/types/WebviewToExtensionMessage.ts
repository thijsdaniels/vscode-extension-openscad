export type WebviewToExtensionMessage =
  | { type: "ready" }
  | {
      type: "parameterChanged";
      name: string;
      value: string | number | boolean | undefined;
    }
  | { type: "exportModel" }
  | { type: "error"; message: string };

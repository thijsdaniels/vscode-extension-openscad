import { ScadParameter } from "./parameters";

export type ExtensionToWebviewMessage =
	| { type: "ready" }
	| { type: "loadingState"; loading: boolean; message?: string }
	| { type: "update"; content: string } // base64 STL
	| { type: "updateParameters"; parameters: ScadParameter[] }
	| { type: "error"; message: string };

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| { type: "parameterChanged"; name: string; value: any }
	| { type: "exportStl" }
	| { type: "error"; message: string };

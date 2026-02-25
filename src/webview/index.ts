import {
	provideVSCodeDesignSystem,
	vsCodeCheckbox,
	vsCodeTextField,
} from "@vscode/webview-ui-toolkit";
import { ParameterControls } from "./ParameterControls";
import { Preview } from "./Preview";

const vscode = acquireVsCodeApi();

provideVSCodeDesignSystem().register(vsCodeCheckbox(), vsCodeTextField());

let preview: Preview;
let parameterControls: ParameterControls;

window.addEventListener("load", () => {
	const previewContainer = document.getElementById("preview");
	const parametersContainer = document.getElementById("parameters");

	if (!previewContainer || !parametersContainer) {
		reportError("Required containers not found");
		return;
	}

	preview = new Preview(previewContainer);

	parameterControls = new ParameterControls(
		parametersContainer,
		(name, value) => {
			vscode.postMessage({
				type: "parameterChanged",
				name,
				value,
			});
		}
	);

	vscode.postMessage({ type: "ready" });
});

window.addEventListener("message", (event) => {
	const message = event.data;

	switch (message.type) {
		case "update":
			if (!message.content) {
				reportError("No content in update message");
				return;
			}
			preview.loadSTL(message.content);
			break;
		case "updateParameters":
			if (!message.parameters) {
				reportError("No parameters in update message");
				return;
			}
			parameterControls.update(message.parameters);
			break;
	}
});

function reportError(error: unknown) {
	console.error("[OpenSCAD Preview]", error);
	vscode.postMessage({
		type: "error",
		message: error?.toString(),
	});
}

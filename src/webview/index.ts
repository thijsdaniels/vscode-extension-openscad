import { Preview } from "./Preview";

const vscode = acquireVsCodeApi();
let preview: Preview;

window.addEventListener("load", () => {
	const container = document.getElementById("preview");

	if (!container) {
		return;
	}

	preview = new Preview(container);
	preview.animate();
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
			preview.updateParameters(message.parameters);
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

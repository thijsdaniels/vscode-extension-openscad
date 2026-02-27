import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeTextField,
} from "@vscode/webview-ui-toolkit";
import { ParameterControls } from "./components/ParameterControls";
import { Preview } from "./components/Preview";

const vscode = acquireVsCodeApi();

provideVSCodeDesignSystem().register(
  vsCodeCheckbox(),
  vsCodeTextField(),
  vsCodeButton(),
);

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
    },
  );

  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      vscode.postMessage({ type: "exportModel" });
    });
  }

  const toggleParametersBtn = document.getElementById("toggle-parameters");
  const parametersPanel = document.getElementById("parameters-panel");
  if (toggleParametersBtn && parametersPanel) {
    toggleParametersBtn.classList.add("active");
    toggleParametersBtn.addEventListener("click", () => {
      if (parametersPanel.style.display === "none") {
        parametersPanel.style.display = "flex";
        toggleParametersBtn.classList.add("active");
      } else {
        parametersPanel.style.display = "none";
        toggleParametersBtn.classList.remove("active");
      }
    });
  }

  vscode.postMessage({ type: "ready" });
});

import { ExtensionToWebviewMessage } from "../shared/types/messages";

window.addEventListener("message", (event) => {
  const message = event.data as ExtensionToWebviewMessage;

  switch (message.type) {
    case "update":
      if (!message.content) {
        reportError("No content in update message");
        return;
      }
      if (message.format === "3mf") {
        preview.load3MF(message.content);
      } else {
        preview.loadSTL(message.content);
      }
      break;
    case "updateParameters":
      if (!message.parameters) {
        reportError("No parameters in update message");
        return;
      }
      parameterControls.update(message.parameters, message.overrides || {});
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

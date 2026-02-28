import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeTextField,
} from "@vscode/webview-ui-toolkit";
import "./components/App";
import "./components/Parameters";
import "./components/Preview";
import "./components/Toolbar";
import { bridge } from "./services/Bridge";

provideVSCodeDesignSystem().register(
  vsCodeCheckbox(),
  vsCodeTextField(),
  vsCodeButton(),
);

window.addEventListener("load", () => {
  const root = document.getElementById("root");
  if (!root) {
    reportError("Root container not found");
    return;
  }

  // Create and append the Lit App root
  const app = document.createElement("scad-app");
  root.appendChild(app);
});

// Extraneous message handling is now handled inside PreviewApp Context Provider.

function reportError(error: unknown) {
  bridge.reportError(error);
}

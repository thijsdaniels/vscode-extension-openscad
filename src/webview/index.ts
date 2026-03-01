import "@vscode-elements/elements";
import "./components/App";
import { bridge } from "./services/Bridge";

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

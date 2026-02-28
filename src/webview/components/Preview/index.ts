import { LitElement, html, css } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { consume } from "@lit/context";
import { modelContext, ModelState } from "../../contexts/ModelContext";
import {
  viewSettingsContext,
  ViewSettingsContext,
} from "../../contexts/ViewSettingsContext";
import { Stage } from "./Stage";

@customElement("scad-canvas")
export class PreviewCanvas extends LitElement {
  static styles = css`
    :host {
      display: block;
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    #canvas-container {
      width: 100%;
      height: 100%;
      display: block;
    }

    .main-canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    #loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background);
      opacity: 0.8;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: var(--vscode-foreground);
    }

    .spinner {
      border: 4px solid
        var(--vscode-editorGhostText-border, rgba(255, 255, 255, 0.1));
      border-top: 4px solid var(--vscode-button-background);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;

  @consume({ context: viewSettingsContext, subscribe: true })
  @state()
  viewSettings!: ViewSettingsContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  modelState!: ModelState;

  @query("#canvas-container")
  private container!: HTMLElement;

  private stage!: Stage;
  private resizeObserver: ResizeObserver | null = null;
  private isInitialized = false;

  firstUpdated() {
    this.stage = new Stage(this.container);
    this.isInitialized = true;

    // Process any state that arrived before initialization
    if (this.viewSettings) {
      this.stage.applySettings(this.viewSettings);
    }
    if (this.modelState?.base64Data) {
      this.stage.loadModelData(this.modelState);
    }

    this.setupResizeHandler();
  }

  // Bridging the declarative Lit cycle with the imperative Three.js cycle
  updated(changedProperties: Map<string, any>) {
    if (!this.isInitialized) return;

    if (changedProperties.has("viewSettings") && this.viewSettings) {
      this.stage.applySettings(this.viewSettings);
    }

    if (changedProperties.has("modelState") && this.modelState) {
      this.stage.loadModelData(this.modelState);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.stage) {
      this.stage.dispose();
    }
  }

  private setupResizeHandler() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.container) {
        this.stage.resize(
          this.container.clientWidth,
          this.container.clientHeight,
        );
      }
    });

    this.resizeObserver.observe(this.container);
  }

  render() {
    return html`
      ${!this.modelState?.base64Data
        ? html`
            <div id="loading-overlay">
              <div class="spinner"></div>
              <div>Rendering SCAD...</div>
            </div>
          `
        : ""}
      <div id="canvas-container"></div>
    `;
  }
}

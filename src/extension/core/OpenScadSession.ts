import { EventEmitter, OutputChannel, Uri } from "vscode";
import { ScadParameter } from "../../shared/types/parameters";
import { OpenScadCli } from "../services/OpenScadCli";
import { ScadParser } from "../services/ScadParser";
import { ScadWatcher } from "../services/ScadWatcher";
import { ScadParameters } from "./ScadParameters";

/**
 * Represents a single SCAD document session.
 * Decouples the file watching and parameter parsing from any specific Webview Panel UI.
 */
export class OpenScadSession {
  private scadWatcher: ScadWatcher;
  private scadParameters: ScadParameters;
  private _lastPreviewData: Buffer | undefined;
  private _lastPreviewFormat: "3mf" | "stl" = "3mf";

  // Events that Views can subscribe to
  private _onPreviewUpdated = new EventEmitter<{
    buffer: Buffer;
    format: "3mf" | "stl";
  }>();
  public readonly onPreviewUpdated = this._onPreviewUpdated.event;

  private _onParametersUpdated = new EventEmitter<{
    parameters: ScadParameter[];
    overrides: Record<string, any>;
  }>();
  public readonly onParametersUpdated = this._onParametersUpdated.event;

  private _onRenderStarted = new EventEmitter<void>();
  public readonly onRenderStarted = this._onRenderStarted.event;

  constructor(
    public readonly documentUri: Uri,
    private readonly cli: OpenScadCli,
    parser: ScadParser,
    logger: OutputChannel,
  ) {
    // Manager for current parameter values
    this.scadParameters = new ScadParameters(() => {
      this.scadWatcher.renderWithParameters(
        this.scadParameters.getParameterArgs(),
      );
    });

    // Watcher for file changes
    this.scadWatcher = new ScadWatcher(
      cli,
      parser,
      logger,
      (data) => {
        if (data.buffer.toString() !== "loading") {
          this._lastPreviewData = data.buffer;
          this._lastPreviewFormat = data.format;
        }
        this._onPreviewUpdated.fire(data);
      },
      (parameters) => {
        this.scadParameters.updateDefinitions(parameters);
        this._onParametersUpdated.fire({
          parameters: this.scadParameters.getParameters(),
          overrides: this.scadParameters.getOverrides(),
        });
        return this.scadParameters.getParameterArgs();
      },
      () => this._onRenderStarted.fire(),
    );

    this.scadWatcher.watchFile(documentUri.fsPath);
  }

  public get lastPreviewData():
    | { buffer: Buffer; format: "3mf" | "stl" }
    | undefined {
    if (!this._lastPreviewData) return undefined;
    return { buffer: this._lastPreviewData, format: this._lastPreviewFormat };
  }

  public get currentParameters(): ScadParameter[] {
    return this.scadParameters.getParameters();
  }

  public get currentOverrides(): Record<string, any> {
    return this.scadParameters.getOverrides();
  }

  public updateParameterValue(name: string, value: any) {
    this.scadParameters.updateValue(name, value);
    this._onParametersUpdated.fire({
      parameters: this.scadParameters.getParameters(),
      overrides: this.scadParameters.getOverrides(),
    });
  }

  public async exportFormat(format: "3mf" | "stl"): Promise<Buffer> {
    return this.cli.render(
      this.documentUri.fsPath,
      this.scadParameters.getParameterArgs(),
      format,
    );
  }

  public dispose() {
    this.scadWatcher.close();
    this._onPreviewUpdated.dispose();
    this._onParametersUpdated.dispose();
    this._onRenderStarted.dispose();
  }
}

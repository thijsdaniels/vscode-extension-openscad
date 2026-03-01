import { FSWatcher, watch } from "chokidar";
import { OutputChannel, workspace } from "vscode";
import { ScadParameter } from "../../shared/types/ScadParameter";
import { ScadCli } from "./ScadCli";
import { ScadParser } from "./ScadParser";
import { ModelFormat } from "../../shared/types/ModelFormat";

export class ScadWatcher {
  private watcher: FSWatcher | undefined;
  private currentScadPath?: string;

  constructor(
    private cli: ScadCli,
    private parser: ScadParser,
    private logger: OutputChannel,
    private onChangeCallback: (data: {
      buffer: Buffer;
      format: ModelFormat;
    }) => void,
    private onParametersCallback?: (
      parameters: ScadParameter[],
    ) => string[] | void,
    private onRenderStartCallback?: () => void,
  ) {}

  async watchFile(scadPath: string) {
    this.currentScadPath = scadPath;

    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = watch(scadPath, {
      persistent: true,
      ignoreInitial: false,
    });

    const handleFileChange = async (path: string) => {
      if (path === scadPath) {
        try {
          if (this.onRenderStartCallback) {
            this.onRenderStartCallback();
          }
          // Notify that we're starting to process
          this.onChangeCallback({
            buffer: Buffer.from("loading"),
            format: ModelFormat.ThreeMF,
          });

          // Get parameters first via injected parser
          const newParams = await this.parser.extractParameters(scadPath);
          let paramArgs: string[] = [];
          if (this.onParametersCallback) {
            const result = this.onParametersCallback(newParams);
            if (result) {
              paramArgs = result;
            }
          }

          // Then convert to 3MF via injected CLI wrapper
          this.renderPreview(scadPath, paramArgs);
        } catch (error) {
          this.logger.appendLine(`[ERROR] Failed to process file: ${error}`);
        }
      }
    };

    this.watcher.on("add", handleFileChange);
    this.watcher.on("change", handleFileChange);

    // Initial parse
    await handleFileChange(scadPath);
  }

  renderWithParameters(paramArgs: string[]) {
    if (!this.currentScadPath) return;
    if (this.onRenderStartCallback) {
      this.onRenderStartCallback();
    }
    this.renderPreview(this.currentScadPath, paramArgs);
  }

  private async renderPreview(scadPath: string, paramArgs: string[] = []) {
    try {
      const format = workspace
        .getConfiguration("openscad")
        .get<ModelFormat>("previewFormat", ModelFormat.ThreeMF);

      const modelBuffer = await this.cli.render(scadPath, paramArgs, format);
      this.onChangeCallback({ buffer: modelBuffer, format });
    } catch {
      // Errors are already logged in the CLI wrapper
    }
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

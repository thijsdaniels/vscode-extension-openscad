import { workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { ScadClient } from "./ScadClient";

type OnStartCallback = () => void;

type OnCompleteCallback = (data: {
  buffer: Buffer;
  format: ModelFormat;
}) => void;

export class ScadRenderer {
  private onStart?: OnStartCallback;
  private onComplete: OnCompleteCallback;

  constructor({
    onStart,
    onComplete,
  }: {
    onStart?: OnStartCallback;
    onComplete: OnCompleteCallback;
  }) {
    this.onStart = onStart;
    this.onComplete = onComplete;
  }

  public async render(
    path: string,
    parameters: Record<string, string | number | boolean>,
  ) {
    if (!path) return;

    if (this.onStart) {
      this.onStart();
    }

    const format = workspace
      .getConfiguration("openscad")
      .get<ModelFormat>("previewFormat", ModelFormat.ThreeMF);

    const modelBuffer = await ScadClient.render(path, parameters, format);

    this.onComplete({ buffer: modelBuffer, format });
  }
}

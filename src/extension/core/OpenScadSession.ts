import * as vscode from "vscode";
import { ScadParameter } from "../../shared/types/parameters";
import { ScadParameters } from "./ScadParameters";
import { OpenScadCli } from "../services/OpenScadCli";
import { ScadParser } from "../services/ScadParser";
import { ScadWatcher } from "../services/ScadWatcher";

/**
 * Represents a single SCAD document session.
 * Decouples the file watching and parameter parsing from any specific Webview Panel UI.
 */
export class OpenScadSession {
	private scadWatcher: ScadWatcher;
	private scadParameters: ScadParameters;
	private _lastStlData: Buffer | undefined;

	// Events that Views can subscribe to
	private _onStlUpdated = new vscode.EventEmitter<Buffer>();
	public readonly onStlUpdated = this._onStlUpdated.event;

	private _onParametersUpdated = new vscode.EventEmitter<ScadParameter[]>();
	public readonly onParametersUpdated = this._onParametersUpdated.event;

	private _onRenderStarted = new vscode.EventEmitter<void>();
	public readonly onRenderStarted = this._onRenderStarted.event;

	constructor(
		public readonly documentUri: vscode.Uri,
		cli: OpenScadCli,
		parser: ScadParser,
		logger: vscode.OutputChannel,
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
			(stlData) => {
				if (stlData.toString() !== "loading") {
					this._lastStlData = stlData;
				}
				this._onStlUpdated.fire(stlData);
			},
			(parameters) => {
				this.scadParameters.updateDefinitions(parameters);
				this._onParametersUpdated.fire(this.scadParameters.getParameters());
			},
			() => this._onRenderStarted.fire(),
		);

		this.scadWatcher.watchFile(documentUri.fsPath);
	}

	public get lastStlData(): Buffer | undefined {
		return this._lastStlData;
	}

	public get currentParameters(): ScadParameter[] {
		return this.scadParameters.getParameters();
	}

	public updateParameterValue(name: string, value: any) {
		this.scadParameters.updateValue(name, value);
	}

	public dispose() {
		this.scadWatcher.close();
		this._onStlUpdated.dispose();
		this._onParametersUpdated.dispose();
		this._onRenderStarted.dispose();
	}
}

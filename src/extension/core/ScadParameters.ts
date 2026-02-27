import { ScadParameter } from "../../shared/types/parameters";

export class ScadParameters {
	private parameters: Map<string, ScadParameter> = new Map();
	private onChangeCallback?: () => void;

	constructor(onChangeCallback?: () => void) {
		this.onChangeCallback = onChangeCallback;
	}

	updateDefinitions(newParameters: ScadParameter[]) {
		// Preserve existing values when updating parameter definitions
		newParameters.forEach((param) => {
			const existing = this.parameters.get(param.name);
			if (existing) {
				param.value = existing.value;
			}
			this.parameters.set(param.name, param);
		});

		// Remove parameters that no longer exist
		const newParamNames = new Set(newParameters.map((p) => p.name));
		for (const [name] of this.parameters) {
			if (!newParamNames.has(name)) {
				this.parameters.delete(name);
			}
		}
	}

	updateValue(name: string, value: any) {
		const param = this.parameters.get(name);
		if (param) {
			param.value = value;
			this.parameters.set(name, param);
			this.onChangeCallback?.();
		}
	}

	getParameters(): ScadParameter[] {
		return Array.from(this.parameters.values());
	}

	getParameterArgs(): string[] {
		return Array.from(this.parameters.values()).flatMap((p) => [
			"--D",
			`${p.name}=${p.value}`,
		]);
	}
}

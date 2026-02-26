import { ScadParameter } from "../ScadParameter";

export class ParameterControls {
	private container: HTMLElement;
	private onChange?: (name: string, value: unknown) => void;

	constructor(
		container: HTMLElement,
		onChange?: (name: string, value: unknown) => void
	) {
		this.container = container;
		this.container.className = "parameters";

		this.onChange = onChange;
	}

	update(parameters: ScadParameter[]) {
		const groups = new Map<string, ScadParameter[]>();
		parameters.forEach((param) => {
			const group = param.group || "Parameters";
			if (!groups.has(group)) {
				groups.set(group, []);
			}
			groups.get(group)?.push(param);
		});

		this.container.innerHTML = "";

		groups.forEach((params, groupName) => {
			const groupDiv = document.createElement("div");
			groupDiv.className = "parameter-group";

			const groupTitle = document.createElement("h3");
			groupTitle.textContent = groupName;
			groupDiv.appendChild(groupTitle);

			params.forEach((param) => {
				const paramDiv = document.createElement("div");
				paramDiv.className = "parameter";

				const label = document.createElement("label");
				label.textContent = this.formatParameterName(param.name, groupName);
				paramDiv.appendChild(label);

				const input = this.createInput(param);
				paramDiv.appendChild(input);
				groupDiv.appendChild(paramDiv);
			});

			this.container.appendChild(groupDiv);
		});
	}

	private formatParameterName(paramName: string, groupName: string): string {
		const words = paramName
			.replace(/_/g, " ") // handle snake_case and CONST_CASE
			.replace(/([A-Z])/g, " $1") // handle camelCase and PascalCase
			.trim()
			.replace(/\s+/g, " ") // normalize multiple spaces
			.split(" ");

		if (
			words.length > 1 &&
			words[0].toLowerCase() === groupName.toLowerCase()
		) {
			words.shift();
		}

		return words
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");
	}

	private createInput(param: ScadParameter): HTMLElement {
		switch (param.type) {
			case "boolean": {
				const input = document.createElement(
					"vscode-checkbox"
				) as HTMLInputElement;

				input.checked = param.value;
				input.addEventListener("change", () => {
					this.onChange?.(param.name, input.checked);
				});

				return input;
			}
			case "number": {
				const input = document.createElement(
					"vscode-text-field"
				) as HTMLInputElement;

				input.size = 5;
				input.value = param.value;
				input.addEventListener("change", () => {
					this.onChange?.(param.name, parseFloat(input.value));
				});

				return input;
			}
			case "string": {
				const input = document.createElement(
					"vscode-text-field"
				) as HTMLInputElement;

				input.size = 5;
				input.value = param.value;
				input.addEventListener("change", () => {
					this.onChange?.(param.name, input.value);
				});

				return input;
			}
		}
	}
}

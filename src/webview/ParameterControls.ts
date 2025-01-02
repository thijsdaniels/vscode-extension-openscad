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
				label.textContent = param.name;
				paramDiv.appendChild(label);

				const input = this.createInput(param);
				paramDiv.appendChild(input);
				groupDiv.appendChild(paramDiv);
			});

			this.container.appendChild(groupDiv);
		});
	}

	private createInput(param: ScadParameter): HTMLInputElement {
		let input: HTMLInputElement;

		switch (param.type) {
			case "boolean":
				input = document.createElement("input");
				input.type = "checkbox";
				input.checked = param.value;
				break;
			case "number":
				input = document.createElement("input");
				input.type = "number";
				input.value = param.value;
				break;
			default:
				input = document.createElement("input");
				input.type = "text";
				input.value = param.value;
		}

		input.addEventListener("change", () => {
			const value =
				input.type === "checkbox"
					? input.checked
					: input.type === "number"
					? Number(input.value)
					: input.value;

			this.onChange?.(param.name, value);
		});

		return input;
	}
}

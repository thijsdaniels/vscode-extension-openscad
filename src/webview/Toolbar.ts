export class ViewSettings {
	wireframe = false;
	orthographic = false;
	shadows = true;
	grid = true;
}

export class Toolbar {
	private settings: ViewSettings;
	private buttons: Map<string, HTMLButtonElement> = new Map();

	constructor(
		container: HTMLElement,
		settings: ViewSettings,
		onSettingChange: (setting: keyof ViewSettings) => void
	) {
		this.settings = settings;
		const toolbar = document.createElement("div");
		toolbar.className = "toolbar";

		const buttonConfigs: {
			icon: string;
			title: string;
			setting: keyof ViewSettings;
		}[] = [
			{ icon: "grid_4x4", title: "Toggle Grid", setting: "grid" },
			{ icon: "view_in_ar", title: "Toggle Wireframe", setting: "wireframe" },
			{ icon: "camera", title: "Toggle Orthographic", setting: "orthographic" },
			{ icon: "brightness_6", title: "Toggle Shadows", setting: "shadows" },
		];

		buttonConfigs.forEach(({ icon, title, setting }) => {
			const button = this.createButton(icon, title, setting, onSettingChange);
			toolbar.appendChild(button);
			this.buttons.set(setting, button);
		});

		container.appendChild(toolbar);
	}

	private createButton(
		icon: string,
		title: string,
		setting: keyof ViewSettings,
		onSettingChange: (setting: keyof ViewSettings) => void
	) {
		const button = document.createElement("button");
		button.className = "toolbar-button";
		button.innerHTML = `<span class="material-symbols-outlined">${icon}</span>`;
		button.title = title;
		button.classList.toggle("active", this.settings[setting]);

		button.addEventListener("click", () => {
			this.settings[setting] = !this.settings[setting];
			button.classList.toggle("active");
			onSettingChange(setting);
		});

		return button;
	}
}

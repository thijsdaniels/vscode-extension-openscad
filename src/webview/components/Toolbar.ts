export enum Surfaces {
	Off = "off",
	Grid = "grid",
	BuildPlate = "buildPlate",
}

export enum RenderMode {
	Solid = "solid",
	Wireframe = "wireframe",
	XRay = "xray",
}

type SettingState = boolean | Surfaces;
type IconKey<T> = T extends boolean ? "true" | "false" : T;

interface SettingConfig<T extends SettingState> {
	states: T[];
	icons: Record<IconKey<T>, string>;
	defaultState: T;
}

const settingConfigs: Record<string, SettingConfig<any>> = {
	surfaces: {
		states: [Surfaces.Off, Surfaces.Grid, Surfaces.BuildPlate],
		icons: {
			[Surfaces.Off]: "grid_off",
			[Surfaces.Grid]: "grid_on",
			[Surfaces.BuildPlate]: "square",
		},
		defaultState: Surfaces.Grid,
	},
	renderMode: {
		states: [RenderMode.Solid, RenderMode.XRay, RenderMode.Wireframe],
		icons: {
			[RenderMode.Solid]: "texture",
			[RenderMode.XRay]: "opacity",
			[RenderMode.Wireframe]: "language",
		},
		defaultState: RenderMode.Solid,
	},
	orthographic: {
		states: [false, true],
		icons: {
			false: "visibility",
			true: "deployed_code",
		},
		defaultState: false,
	},
	shadows: {
		states: [false, true],
		icons: {
			false: "circle",
			true: "ev_shadow",
		},
		defaultState: true,
	},
};

export class ViewSettings {
	surfaces = settingConfigs.surfaces.defaultState;
	renderMode = settingConfigs.renderMode.defaultState;
	orthographic = settingConfigs.orthographic.defaultState;
	shadows = settingConfigs.shadows.defaultState;
}

export class Toolbar {
	private settings: ViewSettings;
	private segments: Map<string, HTMLButtonElement[]> = new Map();

	constructor(
		container: HTMLElement,
		settings: ViewSettings,
		onSettingChange: (setting: keyof ViewSettings) => void,
	) {
		this.settings = settings;
		const toolbar = document.createElement("div");
		toolbar.className = "toolbar-groups";

		Object.entries(settingConfigs).forEach(([setting, config]) => {
			const group = document.createElement("div");
			group.className = "segment-group";

			const buttons = this.createSegmentedButton(
				setting as keyof ViewSettings,
				config,
				onSettingChange,
			);

			buttons.forEach((button) => group.appendChild(button));
			toolbar.appendChild(group);
			this.segments.set(setting, buttons);
		});

		container.appendChild(toolbar);
	}

	private createSegmentedButton<T extends SettingState>(
		setting: keyof ViewSettings,
		config: SettingConfig<T>,
		onSettingChange: (setting: keyof ViewSettings) => void,
	): HTMLButtonElement[] {
		const buttons: HTMLButtonElement[] = [];

		config.states.forEach((state, index) => {
			const button = document.createElement("button");
			button.className = "segment-button material-symbols-outlined";
			if (index === 0) button.classList.add("first");
			if (index === config.states.length - 1) button.classList.add("last");

			const iconKey = String(state) as IconKey<T>;
			button.innerHTML = config.icons[iconKey];
			button.title = `${
				setting.charAt(0).toUpperCase() + setting.slice(1)
			}: ${state}`;

			if (this.settings[setting] === state) {
				button.classList.add("active");
			}

			button.addEventListener("click", () => {
				if (this.settings[setting] !== state) {
					this.settings[setting] = state;
					buttons.forEach((b) => b.classList.remove("active"));
					button.classList.add("active");
					onSettingChange(setting);
				}
			});

			buttons.push(button);
		});

		return buttons;
	}
}

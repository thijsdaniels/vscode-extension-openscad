import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ScadParameter } from "../types";

class ViewSettings {
	wireframe = false;
	orthographic = false;
	shadows = true;
	grid = true;
}

class ParameterControls {
	private container: HTMLElement;

	constructor(
		container: HTMLElement,
		onChange: (name: string, value: unknown) => void
	) {
		this.container = container;
		this.container.className = "parameters";
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
			vscode.postMessage({
				type: "parameterChanged",
				name: param.name,
				value,
			});
		});

		return input;
	}
}

class AxesWidget {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;

	constructor(container: HTMLElement) {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

		this.initRenderer(container);
		this.initAxes();
	}

	private initRenderer(container: HTMLElement) {
		this.renderer.setSize(96, 96);
		this.renderer.domElement.style.position = "absolute";
		this.renderer.domElement.style.top = "1rem";
		this.renderer.domElement.style.right = "1rem";
		container.appendChild(this.renderer.domElement);
	}

	private initAxes() {
		const axesHelper = new THREE.AxesHelper(2);
		this.scene.add(axesHelper);

		this.addLabel("X", new THREE.Vector3(2.5, 0, 0), "#ff0000");
		this.addLabel("Y", new THREE.Vector3(0, 2.5, 0), "#00ff00");
		this.addLabel("Z", new THREE.Vector3(0, 0, 2.5), "#0000ff");
	}

	private addLabel(text: string, position: THREE.Vector3, color: string) {
		const canvas = document.createElement("canvas");
		canvas.width = 64;
		canvas.height = 64;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = color;
		ctx.font = "bold 48px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 32, 32);

		const texture = new THREE.CanvasTexture(canvas);
		const material = new THREE.SpriteMaterial({ map: texture });
		const sprite = new THREE.Sprite(material);
		sprite.position.copy(position);
		this.scene.add(sprite);
	}

	update(mainCamera: THREE.Camera) {
		const distance = 7;
		const direction = new THREE.Vector3(0, 0, 1);
		direction.applyQuaternion(mainCamera.quaternion);

		this.camera.position.copy(direction.multiplyScalar(distance));
		this.camera.lookAt(0, 0, 0);
		this.renderer.render(this.scene, this.camera);
	}
}

class Toolbar {
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

class Preview {
	private scene!: THREE.Scene;
	private activeCamera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	private perspectiveCamera!: THREE.PerspectiveCamera;
	private orthoCamera!: THREE.OrthographicCamera;
	private renderer!: THREE.WebGLRenderer;
	private controls!: OrbitControls;
	private mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
	private gridHelper!: THREE.GridHelper;
	private settings: ViewSettings;
	private axesWidget!: AxesWidget;
	private toolbar!: Toolbar;
	private parameterControls!: ParameterControls;

	constructor(container: HTMLElement) {
		this.settings = new ViewSettings();
		this.scene = new THREE.Scene();

		const { width, height } = container.getBoundingClientRect();
		this.initRenderer(container, width, height);
		this.initCameras(width, height);
		this.initScene();

		this.axesWidget = new AxesWidget(container);
		this.toolbar = new Toolbar(
			container,
			this.settings,
			this.handleSettingChange.bind(this)
		);

		const paramContainer = document.getElementById("parameters");
		if (!paramContainer) throw new Error("Parameters container not found");
		this.parameterControls = new ParameterControls(
			paramContainer,
			(name, value) => {
				vscode.postMessage({ type: "parameterChanged", name, value });
			}
		);

		this.setupResizeHandler(container);
	}

	private initRenderer(container: HTMLElement, width: number, height: number) {
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(width, height, false);
		container.appendChild(this.renderer.domElement);
	}

	private initCameras(width: number, height: number) {
		this.perspectiveCamera = new THREE.PerspectiveCamera(
			75,
			width / height,
			0.1,
			1000
		);
		this.perspectiveCamera.position.y = 50;
		this.perspectiveCamera.position.z = 100;

		this.activeCamera = this.perspectiveCamera;

		const aspect = width / height;
		const viewSize = 100;
		this.orthoCamera = new THREE.OrthographicCamera(
			-viewSize * aspect,
			viewSize * aspect,
			viewSize,
			-viewSize,
			0.1,
			1000
		);

		// Initial sync
		this.syncCameras();

		this.controls = new OrbitControls(
			this.perspectiveCamera,
			this.renderer.domElement
		);
		this.controls.addEventListener("change", () => this.syncCameras());
	}

	private syncCameras() {
		this.orthoCamera.position.copy(this.perspectiveCamera.position);
		this.orthoCamera.quaternion.copy(this.perspectiveCamera.quaternion);
		this.orthoCamera.updateProjectionMatrix();
	}

	private initScene() {
		this.scene.background = new THREE.Color(0x2c2a2e);
		this.scene.fog = new THREE.FogExp2(0x2c2a2e, 0.0025);

		this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(100, 200, 50);
		directionalLight.castShadow = true;
		directionalLight.target.position.set(0, 0, 0);
		this.scene.add(directionalLight);

		const spotLight = new THREE.SpotLight(0xffffff, 0.5, 0, 0.15, 1, 0);
		spotLight.position.set(200, 200, 200);
		spotLight.castShadow = true;
		this.scene.add(spotLight);

		const pointLight = new THREE.PointLight(0xffffff, 0.25, 0, 0);
		pointLight.position.set(-200, -200, -200);
		this.scene.add(pointLight);

		this.gridHelper = new THREE.GridHelper(10000, 1000, 0x888888, 0x444444);
		this.scene.add(this.gridHelper);

		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	}

	private handleSettingChange(setting: keyof ViewSettings) {
		switch (setting) {
			case "wireframe":
				if (this.mesh) {
					(this.mesh.material as THREE.MeshStandardMaterial).wireframe =
						this.settings.wireframe;
				}
				break;
			case "orthographic":
				this.activeCamera = this.settings.orthographic
					? this.orthoCamera
					: this.perspectiveCamera;
				break;
			case "shadows":
				this.renderer.shadowMap.enabled = this.settings.shadows;
				if (this.mesh) {
					this.mesh.castShadow = this.settings.shadows;
					this.mesh.receiveShadow = this.settings.shadows;
				}
				break;
			case "grid":
				this.gridHelper.visible = this.settings.grid;
				break;
		}
	}

	loadSTL(stlContent: string) {
		const loader = new STLLoader();
		const binaryString = window.atob(stlContent);

		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		const geometry = loader.parse(bytes.buffer);
		geometry.rotateX(-Math.PI / 2);

		if (this.mesh) {
			this.scene.remove(this.mesh);
		}

		const material = new THREE.MeshStandardMaterial({
			color: 0xffffff,
		});

		this.mesh = new THREE.Mesh(geometry, material);
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;

		this.scene.add(this.mesh);

		if (this.mesh) {
			this.mesh.material.wireframe = this.settings.wireframe;
			this.mesh.castShadow = this.settings.shadows;
			this.mesh.receiveShadow = this.settings.shadows;
		}
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this));
		this.axesWidget.update(this.activeCamera);
		this.renderer.render(this.scene, this.activeCamera);
	}

	private setupResizeHandler(container: HTMLElement) {
		new ResizeObserver(() => {
			const width = container.clientWidth;
			const height = container.clientHeight;
			this.renderer.setSize(width, height, false);

			// Update both cameras
			this.perspectiveCamera.aspect = width / height;
			this.perspectiveCamera.updateProjectionMatrix();

			const viewSize = 100;
			this.orthoCamera.left = -viewSize * (width / height);
			this.orthoCamera.right = viewSize * (width / height);
			this.orthoCamera.top = viewSize;
			this.orthoCamera.bottom = -viewSize;
			this.orthoCamera.updateProjectionMatrix();
		}).observe(container);
	}

	updateParameters(parameters: ScadParameter[]) {
		this.parameterControls.update(parameters);
	}
}

const vscode = acquireVsCodeApi();
let preview: Preview;

window.addEventListener("load", () => {
	const container = document.getElementById("preview");
	if (!container) return;

	preview = new Preview(container);
	preview.animate();
	vscode.postMessage({ type: "ready" });
});

window.addEventListener("message", (event) => {
	const message = event.data;

	switch (message.type) {
		case "update":
			if (!message.content) {
				reportError("No content in update message");
				return;
			}
			preview.loadSTL(message.content);
			break;
		case "updateParameters":
			if (!message.parameters) {
				reportError("No parameters in update message");
				return;
			}
			preview.updateParameters(message.parameters);
			break;
	}
});

function reportError(error: unknown) {
	console.error("[OpenSCAD Preview]", error);
	vscode.postMessage({
		type: "error",
		message: error?.toString(),
	});
}

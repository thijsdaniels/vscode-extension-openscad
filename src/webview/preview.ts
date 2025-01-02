import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ScadParameter } from "../ScadParameter";
import { AxesWidget } from "./AxesWidget";
import { ParameterControls } from "./ParameterControls";
import { Toolbar, ViewSettings } from "./Toolbar";

export class Preview {
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

		if (!paramContainer) {
			throw new Error("Parameters container not found");
		}

		this.parameterControls = new ParameterControls(paramContainer);

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
			flatShading: false,
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

		if (this.mesh) {
			this.mesh.rotation.y += 0.01;
		}

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

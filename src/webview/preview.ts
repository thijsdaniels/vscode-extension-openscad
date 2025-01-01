import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { WebviewApi } from "vscode-webview";
import { ScadParameter } from "../types";

declare const acquireVsCodeApi: () => WebviewApi<unknown>;

const vscode = acquireVsCodeApi();

// Add custom logging
const log = {
	info: (...args: unknown[]) => console.log("[OpenSCAD Preview]", ...args),
	error: (...args: unknown[]) => console.error("[OpenSCAD Preview]", ...args),
};

// Report errors back to extension
function reportError(error: unknown) {
	log.error(error);
	vscode.postMessage({
		type: "error",
		message: error?.toString(),
	});
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let mesh: THREE.Mesh;

window.addEventListener("error", (event) => {
	reportError(event.error || event.message);
});

window.addEventListener("load", () => {
	vscode.postMessage({ type: "ready" });
});

function init() {
	const container = document.getElementById("preview");

	if (!container) {
		reportError("Failed to find preview container.");
		return;
	}

	const width = container.clientWidth;
	const height = container.clientHeight;

	renderer = new THREE.WebGLRenderer({
		antialias: true,
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, false);
	container.appendChild(renderer.domElement);

	camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
	camera.position.y = 50;
	camera.position.z = 100;

	controls = new OrbitControls(camera, renderer.domElement);

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x2c2a2e); // @todo get from vscode theme
	scene.fog = new THREE.FogExp2(0x2c2a2e, 0.005);

	scene.add(new THREE.AmbientLight(0xffffff, 0.25));

	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
	directionalLight.position.set(100, 200, 50);
	directionalLight.castShadow = true;
	directionalLight.target.position.set(0, 0, 0);
	scene.add(directionalLight);

	const spotLight = new THREE.SpotLight(0xffffff, 0.5, 0, 0.15, 1, 0);
	spotLight.position.set(200, 200, 200);
	spotLight.castShadow = true;
	scene.add(spotLight);

	const pointLight = new THREE.PointLight(0xffffff, 0.25, 0, 0);
	pointLight.position.set(-200, -200, -200);
	scene.add(pointLight);

	const gridHelper = new THREE.GridHelper(1000, 100, 0x888888, 0x444444);
	scene.add(gridHelper);

	// Add resize observer after renderer setup
	new ResizeObserver(() => {
		const width = container.clientWidth;
		const height = container.clientHeight;
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}).observe(container);
}

function loadSTL(stlContent: string) {
	const loader = new STLLoader();
	const binaryString = window.atob(stlContent);

	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	const geometry = loader.parse(bytes.buffer);
	geometry.rotateX(-Math.PI / 2);

	if (mesh) {
		scene.remove(mesh);
	}

	const material = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		// flatShading: true,
	});

	mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	scene.add(mesh);
}

function updateParameterControls(parameters: ScadParameter[]) {
	const container = document.getElementById("parameters");
	if (!container) return;

	// Group parameters
	const groups = new Map<string, ScadParameter[]>();
	parameters.forEach((param) => {
		const group = param.group || "Parameters";
		if (!groups.has(group)) {
			groups.set(group, []);
		}
		groups.get(group)?.push(param);
	});

	container.innerHTML = ""; // Clear existing controls

	// Create controls for each group
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

			paramDiv.appendChild(input);
			groupDiv.appendChild(paramDiv);
		});

		container.appendChild(groupDiv);
	});
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

window.addEventListener("message", (event) => {
	const message = event.data;

	switch (message.type) {
		case "update":
			if (!message.content) {
				reportError("No content in update message");
				return;
			}
			loadSTL(message.content);
			break;
		case "updateParameters":
			if (!message.parameters) {
				reportError("No parameters in update message");
				return;
			}
			updateParameterControls(message.parameters);
			break;
	}
});

init();
animate();

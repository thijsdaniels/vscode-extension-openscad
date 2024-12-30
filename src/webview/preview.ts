import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

declare const acquireVsCodeApi: () => {
	postMessage: (message: { type: string; message?: string }) => void;
};

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

// Add error handlers for script loading
window.addEventListener("error", (event) => {
	reportError(event.error || event.message);
});

// Send ready message when initialized
window.addEventListener("load", () => {
	log.info("Webview loaded, sending ready message");
	vscode.postMessage({ type: "ready" });
});

function init() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x2d2d2d);

	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	controls = new OrbitControls(camera, renderer.domElement);
	camera.position.z = 100;

	const light = new THREE.DirectionalLight(0xffffff);
	light.position.set(0, 0, 1);
	scene.add(light);
	scene.add(new THREE.AmbientLight(0x444444));

	// window.addEventListener("resize", onWindowResize, false);
}

// function onWindowResize() {
// 	camera.aspect = window.innerWidth / window.innerHeight;
// 	camera.updateProjectionMatrix();
// 	renderer.setSize(window.innerWidth, window.innerHeight);
// }

function loadSTL(stlContent: string) {
	log.info("Starting STL load");
	try {
		const loader = new STLLoader();
		const binaryString = window.atob(stlContent);
		log.info("Decoded base64, binary length:", binaryString.length);

		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		const geometry = loader.parse(bytes.buffer);

		if (mesh) scene.remove(mesh);

		const material = new THREE.MeshPhongMaterial({
			color: 0xaaaaaa,
			flatShading: true,
		});
		mesh = new THREE.Mesh(geometry, material);

		geometry.computeBoundingBox();
		const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
		mesh.position.sub(center);

		scene.add(mesh);
		log.info("STL loaded successfully");
	} catch (error) {
		reportError(error);
	}
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

window.addEventListener("message", (event) => {
	const message = event.data;
	log.info("Received message:", message.type, "message:", message);
	try {
		switch (message.type) {
			case "update":
				if (!message.content) {
					reportError("No content in update message");
					return;
				}
				loadSTL(message.content);
				break;
		}
	} catch (error) {
		reportError(error);
	}
});

// Initialize after all functions are defined
init();
animate();

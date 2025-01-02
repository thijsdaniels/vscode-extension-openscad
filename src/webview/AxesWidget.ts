import * as THREE from "three";

export class AxesWidget {
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

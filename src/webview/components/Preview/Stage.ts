import {
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ModelFormat } from "../../../shared/types/ModelFormat";
import { ModelContext } from "../../contexts/ModelContext";
import {
  Environment,
  ViewSettingsContext,
} from "../../contexts/ViewSettingsContext";
import { AxesWidget } from "./AxesWidget";
import { CameraRig } from "./CameraRig";
import { CrossSectionRig } from "./CrossSectionRig";
import { EnvironmentRig } from "./EnvironmentRig";
import { LightRig } from "./LightRig";
import { MaterialManager } from "./MaterialManager";

export interface Theme {
  background: Color;
  gridMajor: Color;
  gridMinor: Color;
  fog: Color;
  plate: Color;
  plateGrid: Color;
  additive: Color;
  subtractive: Color;
  accent: Color;
}

export class Stage {
  private container: HTMLElement;
  private renderer: WebGLRenderer;
  private scene: Scene;

  private cameraRig: CameraRig;
  private lightRig: LightRig;
  private environmentRig: EnvironmentRig;
  private materialManager: MaterialManager;

  private modelGroup: Group;
  private axesWidget: AxesWidget;
  private crossSectionRig: CrossSectionRig;
  private viewSettings?: ViewSettingsContext;


  private animationFrameId: number | null = null;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private theme: Theme;

  constructor(container: HTMLElement, theme: Theme) {
    this.container = container;
    this.theme = theme;

    // 1. Initialize core Three.js graph
    this.scene = new Scene();
    this.scene.background = this.theme.background;
    this.scene.fog = new FogExp2(this.theme.fog, 0.001);

    // 2. Initialize DOM Renderer
    const { clientWidth: width, clientHeight: height } = container;
    this.renderer = new WebGLRenderer({ antialias: true, stencil: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width || 1, height || 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.classList.add("main-canvas");
    this.container.appendChild(this.renderer.domElement);

    // 3. Initialize Domain Rigs
    this.cameraRig = new CameraRig(width, height, this.renderer.domElement);
    this.lightRig = new LightRig();
    this.scene.add(this.lightRig.group);
    this.environmentRig = new EnvironmentRig(Environment.None, this.theme);
    this.scene.add(this.environmentRig.group);
    this.materialManager = new MaterialManager();

    // 4. Initialize specialized widgets/groups
    this.modelGroup = new Group();
    this.scene.add(this.modelGroup);
    this.axesWidget = new AxesWidget(container);
    this.crossSectionRig = new CrossSectionRig(
      this.cameraRig.getPerspectiveCamera(),
      this.renderer.domElement,
      this.theme.accent,
    );
    this.scene.add(this.crossSectionRig.group);
    this.crossSectionRig.resize(width || 1, height || 1);

    // Disable orbit while the transform gizmo is being dragged.
    this.crossSectionRig.transformControls.addEventListener(
      "dragging-changed",
      (event) => {
        this.cameraRig.getControls().enabled = !(
          event as unknown as { value: boolean }
        ).value;
      },
    );

    // 5. Input handlers
    this.renderer.domElement.addEventListener("click", this.handleCanvasClick);
    this.renderer.domElement.addEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.renderer.domElement.addEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    document.addEventListener("keydown", this.handleKeyDown);

    // 6. Kickoff
    this.startAnimationLoop();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.renderer.domElement.removeEventListener(
      "click",
      this.handleCanvasClick,
    );
    this.renderer.domElement.removeEventListener(
      "pointerdown",
      this.handlePointerDown,
    );
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.handlePointerMove,
    );
    document.removeEventListener("keydown", this.handleKeyDown);

    this.crossSectionRig.dispose();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  public updateTheme(theme: Theme) {
    this.theme = theme;
    this.scene.background = theme.background;
    this.scene.fog = new FogExp2(theme.fog, 0.001);
    this.environmentRig.setTheme(theme);
    this.crossSectionRig.setTheme(theme);
  }

  public resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height);
    this.cameraRig.resize(width, height);
    this.crossSectionRig.resize(width, height);
    // Render immediately to fill the canvas before the browser paints.
    // Changing canvas width/height attributes clears it, and the animation
    // loop only re-renders on the next RAF — causing a one-frame flicker.
    this.renderer.render(this.scene, this.cameraRig.activeCamera);
  }

  public applySettings(viewSettings: ViewSettingsContext) {
    this.viewSettings = viewSettings;

    this.environmentRig.setEnvironment(viewSettings.get("environment"));
    this.cameraRig.setMode(viewSettings.get("camera"));
    this.renderer.shadowMap.enabled = viewSettings.get("shadows");
    this.materialManager.applyToGroup(this.modelGroup, viewSettings);

    const crossSectionEnabled = viewSettings.get("crossSection");
    this.renderer.localClippingEnabled = crossSectionEnabled;
    this.crossSectionRig.setEnabled(crossSectionEnabled, this.modelGroup);
  }

  public loadModelData(modelState: ModelContext) {
    const { format, base64Data } = modelState;
    if (!base64Data || !format) return;

    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    this.modelGroup.clear();

    if (format === ModelFormat.ThreeMF) {
      const loader = new ThreeMFLoader();
      try {
        const group = loader.parse(bytes.buffer);
        group.rotateX(-Math.PI / 2);

        group.traverse((child) => {
          if (child instanceof Mesh) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((mat) => {
              if (mat.color) {
                const hex = mat.color.getHexString().toLowerCase();
                if (hex === "f9d72c") {
                  mat.color.copy(this.theme.additive);
                } else if (hex === "9dcb51") {
                  mat.color.copy(this.theme.subtractive);
                }
              }
            });

            if (!child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            if (this.viewSettings) {
              // Ensure wireframes/colors are applied immediately to new payload
              this.materialManager.applyToGroup(group, this.viewSettings);
            }
          }
        });
        this.modelGroup.add(group);
      } catch (e) {
        console.error("Failed to parse 3MF:", e);
      }
    } else {
      const loader = new STLLoader();
      try {
        const geometry = loader.parse(bytes.buffer);
        geometry.rotateX(-Math.PI / 2);

        // STLs do not contain color data, so we initialize with a standard blank material
        const material = new MeshStandardMaterial({
          color: this.theme.additive,
          flatShading: false,
          fog: false,
        });

        const mesh = new Mesh(geometry, material);
        this.modelGroup.add(mesh);

        if (this.viewSettings) {
          this.materialManager.applyToGroup(this.modelGroup, this.viewSettings);
        }
      } catch (e) {
        console.error("Failed to parse STL:", e);
      }
    }

    // Re-center the cross-section pivot and rebuild stencil meshes for new geometry.
    this.crossSectionRig.rebuildForModel(this.modelGroup);
  }

  private startAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    this.cameraRig.update();
    this.axesWidget.update(this.cameraRig.activeCamera);
    this.crossSectionRig.update();
    this.renderer.render(this.scene, this.cameraRig.activeCamera);
  };

  private handleCanvasClick = (e: MouseEvent) => {
    const dx = e.clientX - this.pointerDownX;
    const dy = e.clientY - this.pointerDownY;
    if (dx * dx + dy * dy > 9) return; // ignore drag-release as a click (>3px)

    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.crossSectionRig.handleClick(
      new Vector2(x, y),
      this.cameraRig.activeCamera,
    );
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.crossSectionRig.setSnap(e.ctrlKey);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "w":
        this.crossSectionRig.setTransformMode("translate");
        break;
      case "e":
        this.crossSectionRig.setTransformMode("rotate");
        break;
    }
  };
}

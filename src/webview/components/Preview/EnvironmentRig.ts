import { GridHelper, Group, Mesh, MeshStandardMaterial } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import buildPlate from "./assets/models/buildPlate.stl";
import { Environment } from "../../contexts/ViewSettingsContext";

export class EnvironmentRig {
  public group: Group;
  private infiniteGrid: GridHelper;
  private buildPlateMesh!: Mesh;
  private buildPlateGrid!: GridHelper;

  constructor() {
    this.group = new Group();
    this.group.name = "EnvironmentRig";

    this.infiniteGrid = new GridHelper(10000, 1000, 0x888888, 0x444444);
    this.infiniteGrid.material.depthTest = false;
    this.group.add(this.infiniteGrid);

    this.initBuildPlate();
  }

  public updateVisibility(environment: Environment) {
    this.infiniteGrid.visible = environment === Environment.Grid;
    this.buildPlateMesh.visible = environment === Environment.BuildPlate;
    this.buildPlateGrid.visible = environment === Environment.BuildPlate;
  }

  private initBuildPlate() {
    const loader = new STLLoader();
    const geometry = loader.parse(buildPlate.buffer as ArrayBuffer);
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshStandardMaterial({
      color: 0x403e41,
      depthTest: false,
      fog: false,
      metalness: 0.25,
      roughness: 0.75,
    });

    this.buildPlateMesh = new Mesh(geometry, material);
    this.buildPlateMesh.receiveShadow = true;
    this.group.add(this.buildPlateMesh);

    this.buildPlateGrid = new GridHelper(250, 25, 0x888888, 0x555555);
    this.buildPlateGrid.material.depthTest = false;
    this.buildPlateGrid.material.fog = false;
    this.group.add(this.buildPlateGrid);
  }
}

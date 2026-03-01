import {
  BufferGeometry,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Environment } from "../../contexts/ViewSettingsContext";
import buildPlate from "./assets/models/buildPlate.stl";
import { Theme } from "./Stage";

export class EnvironmentRig {
  public group: Group;
  private infiniteGrid?: GridHelper;
  private buildPlate?: {
    mesh: Mesh<BufferGeometry, MeshStandardMaterial>;
    grid: GridHelper;
  };

  constructor(
    private environment: Environment,
    private theme: Theme,
  ) {
    this.group = new Group();
    this.group.name = "EnvironmentRig";

    if (environment === Environment.Grid) {
      this.infiniteGrid = this.initInfiniteGrid();
    } else if (environment === Environment.BuildPlate) {
      this.buildPlate = this.initBuildPlate();
    }
  }

  public setTheme(theme: Theme) {
    this.theme = theme;
    this.redraw();
  }

  public setEnvironment(environment: Environment) {
    this.environment = environment;
    this.redraw();
  }

  private redraw() {
    if (this.infiniteGrid) {
      this.group.remove(this.infiniteGrid);
    }

    if (this.buildPlate) {
      this.group.remove(this.buildPlate.mesh);
      this.group.remove(this.buildPlate.grid);
    }

    if (this.environment === Environment.Grid) {
      this.infiniteGrid = this.initInfiniteGrid();
    } else if (this.environment === Environment.BuildPlate) {
      this.buildPlate = this.initBuildPlate();
    }
  }

  private initInfiniteGrid() {
    const grid = new GridHelper(
      10000,
      1000,
      this.theme.gridMajor,
      this.theme.gridMinor,
    );
    grid.material.depthTest = false;
    this.group.add(grid);
    return grid;
  }

  private initBuildPlate() {
    const loader = new STLLoader();
    const geometry = loader.parse(buildPlate.buffer as ArrayBuffer);
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshStandardMaterial({
      color: this.theme.plate,
      depthTest: false,
      fog: false,
      metalness: 0.25,
      roughness: 0.75,
    });

    const mesh = new Mesh(geometry, material);
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const grid = new GridHelper(
      250,
      25,
      this.theme.plateGrid,
      this.theme.plateGrid,
    );
    grid.material.depthTest = false;
    (grid.material as any).fog = false;
    this.group.add(grid);

    return { mesh, grid };
  }
}

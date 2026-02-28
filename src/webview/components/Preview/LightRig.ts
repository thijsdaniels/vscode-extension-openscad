import {
  AmbientLight,
  DirectionalLight,
  Group,
  PointLight,
  SpotLight,
} from "three";

export class LightRig {
  public group: Group;

  constructor() {
    this.group = new Group();
    this.group.name = "LightRig";

    const ambientLight = new AmbientLight(0xffffff, 0.25 * Math.PI);
    this.group.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.5 * Math.PI);
    directionalLight.position.set(100, 200, 50);
    directionalLight.castShadow = true;
    directionalLight.target.position.set(0, 0, 0);
    this.group.add(directionalLight);

    const spotLight = new SpotLight(0xffffff, 0.5 * Math.PI, 0, 0.15, 1, 0);
    spotLight.position.set(200, 200, 200);
    spotLight.castShadow = true;
    this.group.add(spotLight);

    const pointLight = new PointLight(0xffffff, 0.25 * Math.PI, 0, 0);
    pointLight.position.set(-200, -200, -200);
    this.group.add(pointLight);
  }
}

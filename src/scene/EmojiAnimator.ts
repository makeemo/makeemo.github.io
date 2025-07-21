import {
  Scene,
  Mesh,
  Vector3,
  Animation,
  Color3,
  MeshBuilder,
  StandardMaterial,
  NodeMaterial,
  InputBlock,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock } from "@babylonjs/gui";

export class EmojiAnimator {
  private headMesh!: Mesh;
  private _mouthMesh!: Mesh;
  private _leftPupil!: Mesh;
  private _leftSclera!: Mesh;
  private _rightPupil!: Mesh;
  private _rightSclera!: Mesh;

  private _scleraSize = 0;
  private _pupilSize = 0.1;
  private _baseRadius = 0.3;
  private _widthRatio = 1;
  private _heightRatio = 0.5;
  private _rounding = 1;
  private _sideCurve = 0.25;
  private _topTeethEdge! : InputBlock;
  private _bottomTeethEdge! : InputBlock;

  private _leftEyeBasePosition = new Vector3(-0.2, 0.3, 0.28);
  private _rightEyeBasePosition = new Vector3(-this._leftEyeBasePosition.x, this._leftEyeBasePosition.y, this._leftEyeBasePosition.z);

  private _originalPositions: number[] | Float32Array = new Float32Array();

  public setMouthSize(radiusX: number, radiusY: number): void {
    const innerDepth = 0.06;
    const basePos = this._originalPositions;
    const pos = [...basePos];
    const sphereRadius = 0.5;

    for (let i = 0; i < basePos.length; i += 3) {
      const vx = basePos[i];
      const vy = basePos[i + 1];
      const vz = basePos[i + 2];

      const maxRadius = Math.max(radiusX, radiusY);

      const zAngle = Math.acos(vz / sphereRadius);

      const z0 = Math.sqrt(sphereRadius ** 2 - maxRadius ** 2);
      const z0Angle = Math.acos(z0 / sphereRadius);

      const outerAngle = z0Angle * 1.6;

      const centerAngle = outerAngle * 0.8;
      const innerAngle = centerAngle * 0.8;

      if (zAngle < outerAngle && vz > 0) {

        let rounding = this._rounding;
        let sideCurve = this._sideCurve;
        let radiusXScaled = radiusX;
        let radiusYScaled = radiusY;

        if (zAngle > centerAngle) {
          let ratio = (zAngle - centerAngle) / (outerAngle - centerAngle);
          let opoRatio = 1 - ratio;

          rounding = (1 - rounding) * ratio + rounding;
          sideCurve *= opoRatio;
          radiusXScaled = (maxRadius - radiusX) * ratio + radiusX;
          radiusYScaled = (maxRadius - radiusY) * ratio + radiusY;
        }

        const angle = Math.atan2(vy, vx);

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const px = radiusXScaled * Math.sign(cos) * (Math.abs(cos) ** rounding);
        const py = radiusYScaled * Math.sign(sin) * (Math.abs(sin) ** rounding) + sideCurve * (px * cos - radiusXScaled / 2);

        const pz = Math.sqrt(Math.max(0, sphereRadius ** 2 - px ** 2 - py ** 2));
        // Elliptical projection (not circle)
        const ellipsePoint = new Vector3(px, py, pz);

        let final = ellipsePoint;

        if (zAngle < innerAngle) {
          const tRaw = (innerAngle - zAngle);
          const t = Math.max(0, Math.min(1, tRaw)); // clamp to [0,1]
          const eased = t * t * (3 - 2 * t); // smoothstep easing
          const depth = innerDepth * eased;
          const v = new Vector3(vx, vy, vz);
          final = ellipsePoint.add(v.normalize().scale(-depth)).scale(0.9);
        }

        pos[i] = final.x;
        pos[i + 1] = final.y;
        pos[i + 2] = final.z;
      }
    }

    this._mouthMesh.setVerticesData("position", pos);
    this._mouthMesh.refreshBoundingInfo();
  }

  constructor(private scene: Scene) {}

  async loadEmoji(): Promise<void> {
    // === HEAD ===
    this.headMesh = MeshBuilder.CreateSphere("emojiHead", { diameter: 1, segments: 32 }, this.scene);

    const yellowMat = new StandardMaterial("emojiMat", this.scene);
    yellowMat.diffuseColor = Color3.Yellow();
    this.headMesh.material = yellowMat;

    // Create morph target for "O" mouth
    this._mouthMesh = this.headMesh.clone("mouthShape", null)!;
    this._mouthMesh.setEnabled(false);

    const innerDepth = 0.01;

    this._originalPositions = this.headMesh.getVerticesData("position")!.slice(0); // clone

    // === BLACK SPHERE (MOUTH) ===
    const mouthSphere = MeshBuilder.CreateSphere("mouthSphere", {
      diameter: 1 - Math.sqrt(innerDepth), // slightly smaller than head
      segments: 32,
    }, this.scene);

    const nodeMat = await NodeMaterial.ParseFromSnippetAsync("#4YB2LI#3", this.scene);
    mouthSphere.material = nodeMat;
    mouthSphere.parent = this.headMesh; // optionally attach to head for sync
    this._topTeethEdge = nodeMat.getBlockByName("TopEdge") as InputBlock;
    this._bottomTeethEdge = nodeMat.getBlockByName("BottomEdge") as InputBlock;

    // === EYES ===
    const scleraMat = new StandardMaterial("eyeMat", this.scene);
    scleraMat.diffuseColor = Color3.White();

    const pupilMat = new StandardMaterial("eyeMat", this.scene);
    pupilMat.diffuseColor = Color3.Black();

    const baseSclera = MeshBuilder.CreateSphere("sclera", { diameter: 1 }, this.scene);
    baseSclera.material = scleraMat;

    const basePupil = MeshBuilder.CreateSphere("pupil", { diameterX: 1, diameterY: 1, diameterZ: 0.5 }, this.scene);
    basePupil.material = pupilMat;
    //basePupil.parent = baseSclera;

    this._leftSclera = baseSclera;
    this._leftSclera.name = "Sclera_L";
    this._leftSclera.position = this._leftEyeBasePosition.clone();

    this._leftPupil = basePupil;
    this._leftPupil.name = "Pupil_L";
    this._leftPupil.position = this._leftEyeBasePosition.clone();
    this._leftPupil.lookAt(new Vector3(this._leftEyeBasePosition.x, this._leftEyeBasePosition.y / 2, 0));

    this._rightSclera = baseSclera.clone("Eye_R");
    this._rightSclera.position = this._rightEyeBasePosition.clone();

    this._rightPupil = basePupil.clone("Eye_R");
    this._rightPupil.position = this._rightEyeBasePosition.clone();
    this._rightPupil.lookAt(new Vector3(this._rightEyeBasePosition.x, this._rightEyeBasePosition.y / 2, 0));

    this.updateEyes();
    this.updateMouth();

    this.createUI();
  }

  animateShapeKey(name: string, frameCount = 30): void {
    const manager = this.headMesh.morphTargetManager!;
    const target = manager.getTargetByName(name);
    if (!target) {
      console.warn("Morph target not found:", name);
      return;
    }

    const anim = new Animation("ShapeKeyAnim", "influence", 30, Animation.ANIMATIONTYPE_FLOAT);
    anim.setKeys([
      { frame: 0, value: 0 },
      { frame: frameCount / 2, value: 1 },
      { frame: frameCount, value: 0 },
    ]);
    target.animations = [anim];
    this.scene.beginAnimation(target, 0, frameCount, false);
  }

  async captureFrames(frameCount: number): Promise<ImageData[]> {
    const engine = this.scene.getEngine();
    const frames: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
      this.headMesh.rotation.y += 0.02;
      this.scene.render();

      const pixels = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
      const canvas = new OffscreenCanvas(engine.getRenderWidth(), engine.getRenderHeight());
      const ctx = canvas.getContext("2d")!;
      const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), engine.getRenderWidth(), engine.getRenderHeight());
      ctx.putImageData(imageData, 0, 0);
      frames.push(ctx.getImageData(0, 0, engine.getRenderWidth(), engine.getRenderHeight()));
    }

    return frames;
  }

  public updateMouth(): void {
    const radiusX = this._baseRadius * this._widthRatio;
    const radiusY = this._baseRadius * this._heightRatio;
    this.setMouthSize(radiusX, radiusY);
  }

  public updateEyes(): void {
    const scleraSizeVector = new Vector3(this._scleraSize, this._scleraSize, this._scleraSize);
    const pupilSizeVector = new Vector3(this._pupilSize, this._pupilSize, this._pupilSize);

    this._leftSclera.scaling = scleraSizeVector;
    this._rightSclera.scaling = scleraSizeVector;
    this._leftPupil.scaling = pupilSizeVector;
    this._rightPupil.scaling = pupilSizeVector;

    const limitedHalfScleraSize = Math.max(0.5 * this._scleraSize, 0.06); // distance from center to surface
    const angle = this._leftPupil.rotation.x; // assuming rotation.x is in radians

    const normalYZ = new Vector3(
      0,
      Math.sin(angle),
      Math.cos(angle)
    ).normalize();

    this._leftPupil.position = this._leftEyeBasePosition.add(normalYZ.scale(limitedHalfScleraSize));

    const rightAngle = this._rightPupil.rotation.x;

    const rightNormalYZ = new Vector3(
      0,
      Math.sin(rightAngle),
      Math.cos(rightAngle)
    ).normalize();

    this._rightPupil.position = this._rightEyeBasePosition.add(rightNormalYZ.scale(limitedHalfScleraSize));
  }

  public createUI(): void {
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const panel = new StackPanel();
    panel.width = "240px";
    panel.left = "10px";
    panel.paddingBottom = "20px";
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    ui.addControl(panel);

    const createSlider = (
      labelText: string,
      min: number,
      max: number,
      initial: number,
      onChange: (value: number) => void
    ) => {
      const label = new TextBlock();
      label.text = `${labelText}: ${initial.toFixed(2)}`;
      label.height = "24px";
      label.color = "white";
      panel.addControl(label);

      const slider = new Slider();
      slider.minimum = min;
      slider.maximum = max;
      slider.value = initial;
      slider.height = "20px";
      slider.width = "200px";
      slider.color = "orange";
      slider.background = "gray";
      panel.addControl(slider);

      slider.onValueChangedObservable.add((value) => {
        label.text = `${labelText}: ${value.toFixed(2)}`;

        onChange(value);

        this.updateEyes();
        this.updateMouth();
      });
    };

    createSlider("Sclera Size", 0, 0.2, this._scleraSize, (v) => (this._scleraSize = v));
    createSlider("Pupil Size", 0, 0.2, this._pupilSize, (v) => (this._pupilSize = v));

    createSlider("Mouth Size", 0, 0.5, this._baseRadius, (v) => (this._baseRadius = v));
    createSlider("Width Ratio", 0, 1, this._widthRatio, (v) => (this._widthRatio = v));
    createSlider("Height Ratio", 0, 1, this._heightRatio, (v) => (this._heightRatio = v));
    createSlider("Rounding", 0, 1, this._rounding, (v) => (this._rounding = v));
    createSlider("Side Curve", -0.5, 0.5, this._sideCurve, (v) => (this._sideCurve = v));
    createSlider("Top Teeth Edge", -0.5, 0.5, this._topTeethEdge.value, (v) => (this._topTeethEdge.value = v));
    createSlider("Bottom Teeth Edge", -0.5, 0.5, this._bottomTeethEdge.value, (v) => (this._bottomTeethEdge.value = v));
  }
}

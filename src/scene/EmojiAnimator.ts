import {
  Scene,
  Mesh,
  Vector3,
  Animation,
  Color3,
  MeshBuilder,
  StandardMaterial,
  MorphTarget,
  MorphTargetManager,
  Quaternion,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Slider, StackPanel, TextBlock } from "@babylonjs/gui";

export class EmojiAnimator {
  private headMesh!: Mesh;
  private leftEye!: Mesh;
  private rightEye!: Mesh;

  private _originalPositions: number[] | Float32Array = new Float32Array();
  //private _mouthTarget!: MorphTarget;
  private _mouthMesh!: Mesh;

  public setMouthSize(radius: number, innerDepth = 0.06): void {
    const basePos = this._originalPositions;
    const pos = this._mouthMesh.getVerticesData("position")!;
    const center = new Vector3(0, 0, 0.5);
    const innerRadius = radius * 0.6;
    const outerRadius = radius / 0.6;
    const sphereRadius = 0.5;

    for (let i = 0; i < basePos.length; i += 3) {
      const vx = basePos[i];
      const vy = basePos[i + 1];
      const vz = basePos[i + 2];

      const v = new Vector3(vx, vy, vz);
      const toCenter = v.subtract(center);
      const dist = toCenter.length();

      if (dist < outerRadius) {
        const angle = Math.atan2(toCenter.y, toCenter.x);

        // Clean circular projection (ONLY for inner/mid zone)
        const px = center.x + innerRadius * Math.cos(angle);
        const py = center.y + innerRadius * Math.sin(angle);
        const pz = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - px * px - py * py));
        const circlePoint = new Vector3(px, py, pz);

        let final = v;

        if (dist < radius) {
          // Apply inward deformation using circlePoint as anchor
          const t = (radius - dist) / (radius - innerRadius); // 0 → 1
          const inward = v.normalize().scale(-innerDepth * t * t); // optional easing
          final = circlePoint.add(inward);
        }

        pos[i] = final.x;
        pos[i + 1] = final.y;
        pos[i + 2] = final.z;
      }
    }

    this._mouthMesh.setVerticesData("position", pos);
    this._mouthMesh.refreshBoundingInfo();
    //this._mouthTarget.setPositions(this._mouthMesh.getVerticesData("position")!);
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

    const pos = this._mouthMesh.getVerticesData("position")!;
    const basePos = this.headMesh.getVerticesData("position")!;
    const center = new Vector3(0, 0, 0.5);
    const radius = 0.5;
    const innerRadius = radius * 0.6;
    const outerRadius = radius / 0.6;
    const innerDepth = 0.04;
    const sphereRadius = 0.5;

    this._originalPositions = basePos.slice(0); // clone

    // === BLACK SPHERE (MOUTH) ===
    const mouthSphere = MeshBuilder.CreateSphere("mouthSphere", {
      diameter: 1 - Math.sqrt(innerDepth), // slightly smaller than head
      segments: 32,
    }, this.scene);

    const blackMat = new StandardMaterial("blackMat", this.scene);
    blackMat.diffuseColor = Color3.Black();
    mouthSphere.material = blackMat;
    mouthSphere.parent = this.headMesh; // optionally attach to head for sync

    for (let i = 0; i < basePos.length; i += 3) {
      const vx = basePos[i];
      const vy = basePos[i + 1];
      const vz = basePos[i + 2];

      const v = new Vector3(vx, vy, vz);
      const toCenter = v.subtract(center);
      const dist = toCenter.length();

      if (dist < outerRadius) {
        const angle = Math.atan2(toCenter.y, toCenter.x);

        // Clean circular projection (ONLY for inner/mid zone)
        const px = center.x + innerRadius * Math.cos(angle);
        const py = center.y + innerRadius * Math.sin(angle);
        const pz = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - px * px - py * py));
        const circlePoint = new Vector3(px, py, pz);

        let final = v;

        if (dist < radius) {
          // Apply inward deformation using circlePoint as anchor
          const t = (radius - dist) / (radius - innerRadius); // 0 → 1
          const inward = v.normalize().scale(-innerDepth * t * t); // optional easing
          final = circlePoint.add(inward);
        }

        pos[i] = final.x;
        pos[i + 1] = final.y;
        pos[i + 2] = final.z;
      }
    }
    
    this._mouthMesh.setVerticesData("position", pos);
    //this._mouthTarget = MorphTarget.FromMesh(this._mouthMesh, "MouthO", 0);
    //const manager = new MorphTargetManager();
    //manager.addTarget(this._mouthTarget);
    //this.headMesh.morphTargetManager = manager;

    //this.headMesh.rotation.x = 0.1 * Math.PI;

    // === EYES ===
    const eyeMat = new StandardMaterial("eyeMat", this.scene);
    eyeMat.diffuseColor = Color3.Black();

    const baseEye = MeshBuilder.CreateSphere("eye", { diameter: 0.1 }, this.scene);
    baseEye.material = eyeMat;

    this.leftEye = baseEye;
    this.leftEye.name = "Eye_L";
    this.leftEye.position = new Vector3(-0.2, 0.3, 0.32);

    this.rightEye = baseEye.clone("Eye_R");
    this.rightEye.position = new Vector3(0.2, 0.3, 0.32);

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

  public createUI(): void {
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const panel = new StackPanel();
    panel.width = "220px";
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(panel);

    const label = new TextBlock();
    label.text = "Mouth Radius: 0.30";
    label.height = "30px";
    label.color = "white";
    panel.addControl(label);

    const slider = new Slider();
    slider.minimum = 0;
    slider.maximum = 0.6;
    slider.value = 0.3;
    slider.height = "20px";
    slider.width = "200px";
    slider.color = "orange";
    slider.background = "gray";
    panel.addControl(slider);

    slider.onValueChangedObservable.add(value => {
      label.text = `Mouth Radius: ${value.toFixed(2)}`;
      this.setMouthSize(value);
    });
  }
}

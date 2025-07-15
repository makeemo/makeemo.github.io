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

export class EmojiAnimator {
  private headMesh!: Mesh;
  private leftEye!: Mesh;
  private rightEye!: Mesh;

  constructor(private scene: Scene) {}

  async loadEmoji(): Promise<void> {
    // === HEAD ===
    this.headMesh = MeshBuilder.CreateSphere("emojiHead", { diameter: 1, segments: 32 }, this.scene);

    const yellowMat = new StandardMaterial("emojiMat", this.scene);
    yellowMat.diffuseColor = Color3.Yellow();
    this.headMesh.material = yellowMat;

    // === BLACK SPHERE (MOUTH) ===
    const mouthSphere = MeshBuilder.CreateSphere("mouthSphere", {
      diameter: 0.9, // slightly smaller than head
      segments: 32,
    }, this.scene);

    const blackMat = new StandardMaterial("blackMat", this.scene);
    blackMat.diffuseColor = Color3.Black();
    mouthSphere.material = blackMat;
    mouthSphere.parent = this.headMesh; // optionally attach to head for sync

    // Create morph target for "O" mouth
    const mouthMesh = this.headMesh.clone("mouthShape", null)!;
    mouthMesh.setEnabled(false);

    const pos = mouthMesh.getVerticesData("position")!;
    const basePos = this.headMesh.getVerticesData("position")!;
    const center = new Vector3(0, 0, 0.5); // front-center mouth
    const radius = 0.15;
    const innerRadius = radius * 0.6;
    const innerDepth = 0.1;

    for (let i = 0; i < pos.length; i += 3) {
      const vx = basePos[i];
      const vy = basePos[i + 1];
      const vz = basePos[i + 2];

      const v = new Vector3(vx, vy, vz);
      const toCenter = v.subtract(center);
      const dist = toCenter.length();

      if (dist < radius) {
        // 1. Project vertex to a circle on YZ plane (or XZ for smile)
        const angle = Math.atan2(toCenter.y, toCenter.x);
        const projected = new Vector3(
          center.x + radius * Math.cos(angle),
          center.y + radius * Math.sin(angle),
          center.z
        );

        let final = projected
        if (dist < innerRadius) {
          // 2. Direction from original vertex *to center of sphere* (0,0,0)
          const inwardDir = v.normalize().scale(-innerDepth);
          final = projected.add(inwardDir); // move inward into emoji
        }

        pos[i] = final.x;
        pos[i + 1] = final.y;
        pos[i + 2] = final.z;
      }
    }
    
    mouthMesh.setVerticesData("position", pos);
    const mouthTarget = MorphTarget.FromMesh(mouthMesh, "MouthO", 0);
    const manager = new MorphTargetManager();
    manager.addTarget(mouthTarget);
    this.headMesh.morphTargetManager = manager;

    this.headMesh.rotation.x = 0.1 * Math.PI;

    // === EYES ===
    const eyeMat = new StandardMaterial("eyeMat", this.scene);
    eyeMat.diffuseColor = Color3.Black();

    const baseEye = MeshBuilder.CreateSphere("eye", { diameter: 0.1 }, this.scene);
    baseEye.material = eyeMat;

    this.leftEye = baseEye;
    this.leftEye.name = "Eye_L";
    this.leftEye.position = new Vector3(-0.2, 0.4, 0.2);

    this.rightEye = baseEye.clone("Eye_R");
    this.rightEye.position = new Vector3(0.2, 0.4, 0.2);
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
}

import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh } from "@babylonjs/core";

export class EmojiAnimator {
  private emojiMesh!: Mesh;

  constructor(private scene: Scene) {}

  async loadEmoji(type: string) {
    this.emojiMesh = MeshBuilder.CreateSphere("emoji", { diameter: 1 }, this.scene);
    const mat = new StandardMaterial("emojiMat", this.scene);
    mat.diffuseColor = Color3.Yellow();
    this.emojiMesh.material = mat;
  }

  async captureFrames(frameCount: number): Promise<ImageData[]> {
    const engine = this.scene.getEngine();
    const frames: ImageData[] = [];

    for (let i = 0; i < frameCount; i++) {
      this.emojiMesh.rotation.y += 0.2; // Example animation
      this.scene.render();

      const pixels = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
      const ctx = new OffscreenCanvas(engine.getRenderWidth(), engine.getRenderHeight()).getContext("2d")!;
      const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), engine.getRenderWidth(), engine.getRenderHeight());
      ctx.putImageData(imageData, 0, 0);
      frames.push(ctx.getImageData(0, 0, engine.getRenderWidth(), engine.getRenderHeight()));
    }

    return frames;
  }
}

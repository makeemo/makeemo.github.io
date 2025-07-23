import {
  Scene,
  Mesh,
  Vector3,
  DynamicTexture,
  StandardMaterial,
  Color3,
} from "@babylonjs/core";

export class EmojiEyebrowTextureBuilder {
  private readonly textureSize = 512;

  constructor(
    private readonly scene: Scene,
    private readonly sphere: Mesh,      // Emoji sphere mesh
    private readonly leftEye: Mesh,     // Left eye mesh
    private readonly rightEye: Mesh     // Right eye mesh
  ) {}

  public createTextureWithEyebrows(): DynamicTexture {
    const texture = new DynamicTexture("emojiEyebrows", this.textureSize, this.scene, false);
    const ctx = texture.getContext() as CanvasRenderingContext2D;

    // Fill background (optional)
    ctx.fillStyle = "yellow";
    ctx.fillRect(0, 0, this.textureSize, this.textureSize);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    // UV from 3D eye positions
    const leftUV = this._spherePointToUV(this.leftEye.getAbsolutePosition());
    const rightUV = this._spherePointToUV(this.rightEye.getAbsolutePosition());

    const leftX = leftUV.u * this.textureSize - 30;
    const leftY = (1 - leftUV.v) * this.textureSize;

    const rightX = rightUV.u * this.textureSize + 30;
    const rightY = (1 - rightUV.v) * this.textureSize;

    // Eyebrow offset above eye
    const browOffsetY = -45;
    // Arc center is below the eyebrow (to create upward arc)
    const radius = 85;
    const angleStart1 = Math.PI * 0.45;
    const angleEnd1 = Math.PI * 0.25;
    const angleStart2 = Math.PI * 0.75;
    const angleEnd2 = Math.PI * 0.55;

    // ✅ LEFT eyebrow (draw upward arc: use anticlockwise = true)
    ctx.beginPath();
    ctx.arc(leftX, leftY + browOffsetY, radius, angleStart1, angleEnd1, true);
    ctx.stroke();

    // ✅ RIGHT eyebrow (draw upward arc: clockwise)
    ctx.beginPath();
    ctx.arc(rightX, rightY + browOffsetY, radius, angleEnd2, angleStart2, false);
    ctx.stroke();
    
    texture.update();
    return texture;
  }

  private _spherePointToUV(pos: Vector3): { u: number; v: number } {
    const local = pos.subtract(this.sphere.getAbsolutePosition()).normalize();
    const u = 0.5 + Math.atan2(local.z, local.x) / (2 * Math.PI);
    const v = 0.5 - Math.asin(local.y) / Math.PI;
    return { u, v };
  }
}
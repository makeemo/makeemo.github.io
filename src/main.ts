import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3 } from "@babylonjs/core";
import { EmojiAnimator } from "./scene/EmojiAnimator";
import { setupUI } from "./ui/Controls";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

// Basic camera and light
const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 5, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// Emoji setup
const animator = new EmojiAnimator(scene);
animator.loadEmoji(); // You can extend this

setupUI(animator, () => {
  // Not used now, but you can move the logic back into main if preferred
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

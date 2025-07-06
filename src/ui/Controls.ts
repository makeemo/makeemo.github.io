import { GifExporter } from "../gif/GifExporter";
import type { EmojiAnimator } from "../scene/EmojiAnimator";

export function setupUI(animator: EmojiAnimator, onExport: () => void) {
  const exportBtn = document.getElementById("exportBtn")!;
  const preview = document.getElementById("gifPreview") as HTMLImageElement;
  const downloadLink = document.getElementById("downloadLink") as HTMLAnchorElement;

  exportBtn.addEventListener("click", async () => {
    exportBtn.textContent = "⏳ Rendering...";
    //exportBtn.disabled = true;

    const frames = await animator.captureFrames(30); // 2s @ 15 FPS
    const gifDataUrl = await GifExporter.export(frames, "makeemo.com");

    // Show preview
    preview.src = gifDataUrl;
    preview.style.display = "block";

    // Enable download
    downloadLink.href = gifDataUrl;
    downloadLink.download = "emoji.gif";
    downloadLink.textContent = "⬇️ Download GIF";
    downloadLink.style.display = "inline";

    exportBtn.textContent = "🎬 Export GIF";
    //exportBtn.disabled = false;
  });
}
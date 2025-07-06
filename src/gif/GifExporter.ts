import GIF from 'gif.js';
// @ts-ignore - importing as raw string via vite-plugin-string
import workerScriptText from 'gif.js/dist/gif.worker.js?raw';

export class GifExporter {
  static export(frames: ImageData[], watermarkText: string): Promise<string> {
    return new Promise((resolve) => {
      // Create blob URL for worker
      const blob = new Blob([workerScriptText], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);

      const gif = new GIF({
        workerScript: workerUrl,
        workers: 2,
        quality: 10,
        width: frames[0].width,
        height: frames[0].height,
      });

      for (const frame of frames) {
        const canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(frame, 0, 0);

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.font = "16px sans-serif";
        ctx.fillText(watermarkText, frame.width - 110, frame.height - 10);

        gif.addFrame(ctx, { copy: true, delay: 66 });
      }

      gif.on("finished", (blob: string | Blob) => {
        const b = blob instanceof Blob
          ? blob
          : new Blob([Uint8Array.from(atob(blob as string), c => c.charCodeAt(0))], {
              type: "image/gif",
            });

        resolve(URL.createObjectURL(b));
      });

      gif.render();
    });
  }
}

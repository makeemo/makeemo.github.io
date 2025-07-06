declare module 'gif.js' {
  export default class GIF {
    constructor(options?: any);
    addFrame(imageElement: CanvasRenderingContext2D | HTMLCanvasElement | ImageData, options?: any): void;
    on(event: string, callback: (blobOrData: Blob | string) => void): void;
    render(): void;
  }
}
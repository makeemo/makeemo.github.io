import { defineConfig } from 'vite';
import string from 'vite-plugin-string';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    string({
      include: '**/gif.worker.js', // Enables import of gif.worker.js as raw text
    }),
  ],
  build: {
    target: 'esnext', // modern build
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: true, // auto-open in browser
  },
});

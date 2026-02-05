import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    outDir: '.',
    emptyOutDir: true,
    rollupOptions: {
      input: 'build.js',
      output: {
        dir: '.',
        entryFileNames: 'index.html'
      }
    }
  },
  server: {
    port: 3000,
    hmr: false
  }
});

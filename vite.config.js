import { defineConfig } from 'vite';

export default defineConfig({
  // base: './' критически важен для Яндекс Игр, так как архив разворачивается в подпапке CDN
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild'
  },
  server: {
    port: 3000,
    open: false
  }
});

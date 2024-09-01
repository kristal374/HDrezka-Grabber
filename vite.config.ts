import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: false,
    rollupOptions: {
      input: {
        app: 'src/html/popup.html',
      },
      output: {
        assetFileNames: 'src/[ext]/[name][extname]',
        chunkFileNames: 'src/[chunks]/[name].[hash].js',
        entryFileNames: 'src/js/popup.js',
      },
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: false,
    rollupOptions: {
      input: ['src/html/popup.html', 'src/html/settings.html'],
      output: {
        assetFileNames: 'src/[ext]/[name][extname]',
        chunkFileNames: 'src/js/[name].js',
        entryFileNames: 'src/js/[name].js',
      },
    },
  },
});

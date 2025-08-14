import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      input: ['src/html/popup.html', 'src/html/settings.html'],
      output: {
        assetFileNames: 'src/[ext]/[name][extname]',
        chunkFileNames: 'src/js/[name].js',
        entryFileNames: 'src/js/[name].js',
      },
      onwarn(warning, warn) {
        // Suppress "Module level directives cause errors when bundled" warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
    },
  },
});

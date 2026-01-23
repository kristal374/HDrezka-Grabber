import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: true,
    rollupOptions: {
      input: ['src/html/popup.html', 'src/html/settings.html', 'src/html/logger.html'],
      output: {
        assetFileNames: 'src/[ext]/[name][extname]',
        chunkFileNames: 'src/js/[name].js',
        entryFileNames: 'src/js/[name].js',
      },
      onwarn(warning, warn) {
        // Suppress "Module level directives cause errors when bundled" warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});

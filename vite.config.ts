import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const isProduction = process.env.NODE_ENV === 'production';

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
  root: 'src/html/',
  build: {
    target: 'es2024',
    minify: isProduction,
    sourcemap: !isProduction,
    outDir: '../../dist/build/HDrezka-Grabber.build',
    emptyOutDir: false,
    rollupOptions: {
      input: [
        'src/html/popup.html',
        'src/html/settings.html',
        'src/html/logger.html',
      ],
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

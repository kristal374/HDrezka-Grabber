import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/html',
  resolve: {
    alias: {
      // Replace "some-module" with your noop shim
      '../lib/logger': path.resolve(__dirname, 'src/html/noop.js'),
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: "es2022",
        rollupOptions: {
            output: {
                assetFileNames: 'assets/[ext]/[name][extname]',
                chunkFileNames: 'assets/[chunks]/[name].[hash].js',
                entryFileNames: 'assets/js/index.js'
            }
        }
    }
});

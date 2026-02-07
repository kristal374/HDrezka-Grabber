import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  {
    logLevel: 'debug',
    input: 'src/service-worker/background.ts',
    output: {
      file: 'dist/build/HDrezka-Grabber.build/src/js/background.js',
      sourcemap: !isProduction,
    },
    onwarn(warning, warn) {
      // Suppress "Circular dependencies" warnings from node_modules
      if (
        warning.code === 'CIRCULAR_DEPENDENCY' &&
        /node_modules/.test(warning.message)
      ) {
        return;
      }
      warn(warning);
    },
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript(),
      !isProduction ? terser() : undefined,
      copy({
        targets: [
          {
            src: [
              isProduction
                ? 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js'
                : 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
              'src/extraction-scripts/InjectionScripts/',
            ],
            dest: 'dist/build/HDrezka-Grabber.build/src/js/',
          },
        ],
      }),
    ],
  },
];

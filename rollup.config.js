import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
// import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default [
  {
    logLevel: 'debug',
    input: 'src/service-worker/background.ts',
    output: {
      file: 'dist/build/HDrezka-Grabber.build/src/js/background.js',
      sourcemap: true,
    },
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript(),
      // terser(),
      copy({
        targets: [
          {
            src: [
              'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
              'src/extraction-scripts/InjectionScripts/',
            ],
            dest: 'dist/build/HDrezka-Grabber.build/src/js/',
          },
        ],
      }),
    ],
  },
];

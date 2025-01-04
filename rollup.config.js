import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'src/js/background.ts',
    output: {
      file: 'dist/build/HDrezka-Grabber.build/src/js/background.js',
      sourcemap: true,
    },
    plugins: [
      nodeResolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      typescript({ sourceMap: false }),
      terser(),
      copy({
        targets: [
          {
            src: [
              'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
              'node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map',
              'src/app/hooks/InjectionScripts/',
            ],
            dest: 'dist/build/HDrezka-Grabber.build/src/js/',
          },
        ],
      }),
    ],
  },
];

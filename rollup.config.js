import terser from "@rollup/plugin-terser";

export default [
    {
        input: "src/js/background.js",
        output: {
            file: "background.js",
            sourcemap: true,
        },
        plugins: [terser()],
    },
];

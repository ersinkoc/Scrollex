import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    // No `clean` here: tsup runs the configs in this array in parallel, and cleaning
    // `dist` from this one races the other config's `dist/plugins` output (it could
    // delete the plugin .d.ts files after they were written). `npm run build` cleans
    // the folder once, before tsup starts.
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.jsx = 'automatic'
    },
  },
  // Plugins entry
  {
    entry: ['src/plugins/index.ts'],
    outDir: 'dist/plugins',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['react', 'react-dom'],
    esbuildOptions(options) {
      options.jsx = 'automatic'
    },
  },
])

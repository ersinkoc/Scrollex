import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
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

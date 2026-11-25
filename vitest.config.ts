import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // 70 jsdom environments run in parallel and several suites wait on the mocked
    // 16ms RAF timer. With coverage instrumentation those waits get starved and the
    // 5s default expires on whichever tests happen to be scheduled last, which made
    // `npm run test:coverage` flaky. The tests are fast; give the timers room.
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/types.ts',
      ],
      // Floors set from the measured suite (93.84 / 83.56 / 92.82 / 95.22), not
      // from a goal: raising them is a deliberate act, dropping below is a regression.
      thresholds: {
        statements: 93,
        branches: 83,
        functions: 92,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
})

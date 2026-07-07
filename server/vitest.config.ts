import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Each test file gets its own module registry (default isolate), so the db
    // singleton and its in-memory PGlite are per-file — no cross-test bleed.
  },
})

// Vitest global setup — runs before each test file's module graph loads.
// Force an in-memory PGlite so tests never touch a real database or the
// dev .data/ directory.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'pglite://memory'
process.env.LOG_LEVEL = 'silent'

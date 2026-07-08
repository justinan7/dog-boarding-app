import { defineConfig } from 'drizzle-kit'

// Migrations are generated offline from the schema (`npm run db:generate`) — no
// DB connection needed. They apply to real Postgres (prod) and PGlite (dev/test)
// alike, since PGlite is Postgres.
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
})

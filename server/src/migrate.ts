// CLI entrypoint for migrations — its own file (not a self-executing guard in
// db/migrate.ts) so bundling into dist/ is safe.
//   dev:  npm run db:migrate      (tsx src/migrate.ts)
//   prod: node dist/migrate.js    (deliberate deploy step, task B14)
import { initDb } from './db/client'
import { runMigrations } from './db/migrate'

await initDb()
await runMigrations()
process.exit(0)

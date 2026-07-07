import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Driver auto-selected by scheme (see db/client.ts). Defaults to a persisted
  // in-process PGlite so `npm run dev` works with zero infrastructure.
  DATABASE_URL: z.string().default('pglite://.data/dev'),
})

export type Env = z.infer<typeof schema>

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  // Fail fast and loud — a misconfigured server should never half-start.
  console.error('Invalid environment:', z.treeifyError(parsed.error))
  throw new Error('Invalid environment configuration')
}

export const env: Env = parsed.data
export const isProd = env.NODE_ENV === 'production'

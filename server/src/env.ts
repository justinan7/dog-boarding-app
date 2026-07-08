import 'dotenv/config' // auto-load server/.env so `npm run dev/db:*` need no manual sourcing
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Driver auto-selected by scheme (see db/client.ts). Defaults to a persisted
  // in-process PGlite so `npm run dev` works with zero infrastructure.
  DATABASE_URL: z.string().default('pglite://.data/dev'),
  // Better Auth session signing secret. In prod this comes from sops-nix; in
  // dev/test a deterministic default keeps things working without a .env file.
  BETTER_AUTH_SECRET: z.string().default('zoomez-dev-secret-not-for-production'),
  // Public domain for CORS trustedOrigins (prod only; dev hardcodes localhost).
  PUBLIC_DOMAIN: z.string().optional(),
  // S3-compatible object storage (Garage in prod). Optional in dev.
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('garage'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
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

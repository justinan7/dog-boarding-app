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
  // Manager PIN for elevation (real value from secrets in prod; 1234 = demo).
  MANAGER_PIN: z.string().min(4).default('1234'),
  // Demo mode: PWA shows the demo role bar / sign-up hints / PIN hint.
  // Defaults ON (dev + the demo-world prod phase); flip to 'false' when the
  // business goes live with real data.
  DEMO_MODE: z.string().default('true').transform((v) => v === 'true' || v === '1'),
  // Absolute path to the built PWA (web/dist). When set, the API serves it
  // with an SPA fallback — the production monolith mode.
  WEB_DIST: z.string().optional(),
  // S3-compatible object storage (Garage in prod). Optional in dev — media
  // falls back to local disk under MEDIA_DIR (ADR-013).
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('garage'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  MEDIA_DIR: z.string().default('.data/media'),
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

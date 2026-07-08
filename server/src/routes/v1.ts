import { Hono } from 'hono'
import { health } from './health'
import { me } from './me'
import type { AppEnv } from '../lib/hono-env'

export const v1 = new Hono<AppEnv>()

v1.route('/health', health)
v1.route('/me', me)

v1.get('/', (c) =>
  c.json({
    name: 'zoomez-api',
    version: 'v1',
    docs: 'see docs/api-contract.md',
  }),
)

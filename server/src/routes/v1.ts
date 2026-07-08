import { Hono } from 'hono'
import { health } from './health'
import { me } from './me'
import { customersRouter } from './customers'
import { petsRouter } from './pets'
import { capacityRouter } from './capacity'
import { reservationsRouter } from './reservations'
import { threadsRouter } from './threads'
import { careTasksRouter } from './care-tasks'
import { reportCardsRouter } from './report-cards'
import { shiftsRouter } from './shifts'
import { addonsRouter } from './addons'
import { incidentsRouter } from './incidents'
import { reportsRouter } from './reports'
import { pushRouter } from './push'
import type { AppEnv } from '../lib/hono-env'

export const v1 = new Hono<AppEnv>()

v1.route('/health', health)
v1.route('/me', me)
v1.route('/customers', customersRouter)
v1.route('/pets', petsRouter)
v1.route('/capacity', capacityRouter)
v1.route('/reservations', reservationsRouter)
v1.route('/threads', threadsRouter)
v1.route('/care-tasks', careTasksRouter)
v1.route('/report-cards', reportCardsRouter)
v1.route('/shifts', shiftsRouter)
v1.route('/addons', addonsRouter)
v1.route('/incidents', incidentsRouter)
v1.route('/reports', reportsRouter)
v1.route('/push', pushRouter)

v1.get('/', (c) =>
  c.json({
    name: 'zoomez-api',
    version: 'v1',
    docs: 'see docs/api-contract.md',
  }),
)

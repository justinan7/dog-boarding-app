import { Hono } from 'hono'
import { health } from './health'

// The /api/v1 surface. New resource routers mount here as they land
// (customers/pets B4, reservations B5, threads B6, …) per api-contract.md §5.
export const v1 = new Hono()

v1.route('/health', health)

v1.get('/', (c) =>
  c.json({
    name: 'zoomez-api',
    version: 'v1',
    docs: 'see docs/api-contract.md',
  }),
)

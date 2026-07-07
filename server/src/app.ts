import { Hono } from 'hono'
import { v1 } from './routes/v1'
import { renderError } from './lib/errors'

/** Build the Hono app. Exported (not started) so tests use app.request(). */
export function createApp() {
  const app = new Hono()

  app.route('/api/v1', v1)

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
  )
  app.onError((err, c) => renderError(c, err))

  return app
}

export const app = createApp()

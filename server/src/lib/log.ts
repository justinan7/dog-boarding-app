import { pino } from 'pino'
import { env } from '../env'

// Plain JSON to stdout — journald captures it in prod. For pretty local logs,
// pipe through pino-pretty: `npm run dev | npx pino-pretty`.
export const log = pino({ level: env.LOG_LEVEL })

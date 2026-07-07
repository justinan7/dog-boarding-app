import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

// Error envelope + codes from api-contract.md §1.
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ELEVATION_REQUIRED'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'CAPACITY_FULL'
  | 'RATE_LIMITED'
  | 'INTERNAL'

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  ELEVATION_REQUIRED: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  CAPACITY_FULL: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

/** Throw this anywhere in a handler; the app's onError renders the envelope. */
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = details
  }
}

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export function renderError(c: Context, err: unknown) {
  if (err instanceof AppError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message, details: err.details } }
    return c.json(body, err.status as never)
  }
  if (err instanceof HTTPException) {
    const body: ErrorBody = { error: { code: 'INTERNAL', message: err.message } }
    return c.json(body, err.status)
  }
  const body: ErrorBody = { error: { code: 'INTERNAL', message: 'Internal server error' } }
  return c.json(body, 500)
}

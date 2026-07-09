import type { Reservation } from './queries'

/** Statuses that count as a live/upcoming stay for the customer view. */
const ACTIVE = new Set(['requested', 'approved', 'checked_in', 'in_stay'])

/** The customer's live/upcoming stays, soonest first. */
export function activeStays(items: Reservation[] | undefined): Reservation[] {
  return (items ?? [])
    .filter((r) => ACTIVE.has(r.status))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  checked_in: 'Checked in',
  in_stay: 'In residence',
  completed: 'Completed',
  cancelled: 'Cancelled',
  denied: 'Denied',
  waitlist: 'Waitlisted',
}

export function statusTone(status: string): 'success' | 'gold' | 'neutral' | 'error' {
  if (status === 'approved' || status === 'checked_in' || status === 'in_stay') return 'success'
  if (status === 'requested' || status === 'waitlist') return 'gold'
  if (status === 'denied' || status === 'cancelled') return 'error'
  return 'neutral'
}

/** "Dogs" line: 'Biscuit' / 'Biscuit & Bella' / 'Biscuit, Bella & Rocky'. */
export function petLine(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'Your dog'
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

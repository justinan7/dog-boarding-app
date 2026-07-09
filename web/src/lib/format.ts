/** 'HH:MM' (24h) → '4:00 PM'. */
export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = (h ?? 0) >= 12 ? 'PM' : 'AM'
  const h12 = ((h ?? 0) % 12) || 12
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

/** 'HH:MM' → '4:00p' (compact, for dense rows). */
export function fmtTimeCompact(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = (h ?? 0) >= 12 ? 'p' : 'a'
  const h12 = ((h ?? 0) % 12) || 12
  return `${h12}:${String(m ?? 0).padStart(2, '0')}${period}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Parse 'YYYY-MM-DD' as a LOCAL date (new Date(str) would parse UTC and shift a day). */
export function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1)
}

/** '2026-07-04' → 'Jul 4'. */
export function fmtDate(ymd: string): string {
  const d = parseDate(ymd)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** '2026-07-04','2026-07-06' → 'Jul 4 – 6' (or 'Jun 30 – Jul 2' across months). */
export function fmtDateRange(start: string, end: string): string {
  const s = parseDate(start), e = parseDate(end)
  if (s.getMonth() === e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}

/** '2026-07-04' → 'Saturday'. */
export function fmtWeekday(ymd: string): string {
  return WEEKDAYS[parseDate(ymd).getDay()] ?? ''
}

/** '2026-07-05' → 'Saturday, Jul 5'. */
export function fmtDayLong(ymd: string): string {
  return `${fmtWeekday(ymd)}, ${fmtDate(ymd)}`
}

/** Nights between two 'YYYY-MM-DD' dates. */
export function nightsBetween(start: string, end: string): number {
  return Math.max(0, Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000))
}

/** ISO timestamp → 'Friday, 4:12 PM' (device-local clock). */
export function fmtStamp(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  return `${WEEKDAYS[d.getDay()]}, ${(h % 12) || 12}:${String(m).padStart(2, '0')} ${period}`
}

/** ISO timestamp → '4:12 PM'. */
export function fmtClock(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/** Cents → '$135' (whole dollars; the price list is whole-dollar). */
export function fmtDollars(cents: number): string {
  const d = cents / 100
  return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`
}

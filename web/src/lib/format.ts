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

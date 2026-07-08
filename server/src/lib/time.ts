// DST-correct wall-clock → UTC conversion using the built-in Intl timezone
// database (no dependency). Replaces the earlier hardcoded ±7 offset, which was
// wrong half the year and for every non-LA zone (data-model invariant 4).

/** Offset in ms between the given IANA zone and UTC at a specific instant. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = dtf.formatToParts(at)
  const map: Record<string, number> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value)
  // What UTC instant would produce this wall-clock reading if it *were* UTC?
  const asIfUtc = Date.UTC(map.year!, map.month! - 1, map.day!, map.hour!, map.minute!, map.second!)
  return asIfUtc - at.getTime()
}

/**
 * Interpret a local wall-clock date+time as being in `timeZone` and return the
 * absolute UTC instant. Handles DST via a guess-then-correct pass (the offset
 * that applies at the resulting instant), which is accurate outside the ~1h
 * ambiguous windows at a DST transition — fine for scheduling med alerts.
 *
 * @param dateStr 'YYYY-MM-DD'
 * @param timeStr 'HH:MM'
 */
export function zonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  // Guess: pretend the wall time is UTC.
  const guessUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!, 0)
  // Correct by the offset that applies at the guessed instant.
  const offset = tzOffsetMs(timeZone, new Date(guessUtc))
  const corrected = guessUtc - offset
  // One more refinement in case the guess landed on the wrong side of a DST edge.
  const offset2 = tzOffsetMs(timeZone, new Date(corrected))
  return offset2 === offset ? new Date(corrected) : new Date(guessUtc - offset2)
}

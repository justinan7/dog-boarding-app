import type { Reservation, CareTask } from './queries'

/** Reservation statuses that put a dog "here now". */
const RESIDENT = new Set(['checked_in', 'in_stay'])

export interface RosterDog {
  petId: string
  name: string
  breed?: string | null
  reservation: Reservation
  due: number
  overdue: number
  done: number
  nextTask?: CareTask
}

/**
 * The demo world's "today": the busiest scheduled date on the task rail. The
 * seed lives on Wed Jul 3 2026 while the device clock is whenever you run it,
 * so the staff day view anchors to the data, not the wall clock.
 */
export function seedToday(tasks: CareTask[] | undefined): string {
  const freq = new Map<string, number>()
  for (const t of tasks ?? []) freq.set(t.scheduledDate, (freq.get(t.scheduledDate) ?? 0) + 1)
  let best: string | null = null
  let bestN = 0
  for (const [d, n] of freq) {
    if (n > bestN) { best = d; bestN = n }
  }
  return best ?? new Date().toISOString().slice(0, 10)
}

/** In-residence dogs with their day-of task rollup, most urgent first. */
export function rosterDogs(
  reservations: Reservation[] | undefined,
  tasks: CareTask[] | undefined,
  date: string,
): RosterDog[] {
  const dayTasks = (tasks ?? []).filter((t) => t.scheduledDate === date)
  const seen = new Set<string>()
  const dogs: RosterDog[] = []

  for (const r of (reservations ?? []).filter((r) => RESIDENT.has(r.status))) {
    for (const p of r.pets) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      const mine = dayTasks.filter((t) => t.petId === p.id)
      const open = mine
        .filter((t) => t.state === 'scheduled' || t.state === 'overdue')
        .sort((a, b) => a.nextFireUtc.localeCompare(b.nextFireUtc))
      dogs.push({
        petId: p.id,
        name: p.name,
        breed: p.breed,
        reservation: r,
        due: mine.filter((t) => t.state === 'scheduled').length,
        overdue: mine.filter((t) => t.state === 'overdue').length,
        done: mine.filter((t) => t.state === 'done').length,
        nextTask: open[0],
      })
    }
  }

  return dogs.sort((a, b) => (b.overdue - a.overdue) || (b.due - a.due) || a.name.localeCompare(b.name))
}

/** Parse '3:30 PM' / '15:30' style text into 'HH:MM' (24h); null if hopeless. */
export function parseTimeText(text: string): string | null {
  const m = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const period = m[3]?.toLowerCase()
  if (period === 'pm' && h < 12) h += 12
  if (period === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

import type PgBoss from 'pg-boss'
import { eq, and, lte, inArray } from 'drizzle-orm'
import { getDb } from '../db/client'
import { careTasks, shifts, shiftClaims, pets } from '../db/schema'
import { pushToUsers, pushToStaff } from '../lib/push-sender'
import { log } from '../lib/log'

/** 'HH:MM' → '4:00 PM' (worker-side copy of the client formatter). */
function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = (h ?? 0) >= 12 ? 'PM' : 'AM'
  return `${((h ?? 0) % 12) || 12}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

const JOB_NAME = 'care-alert'

interface CareAlertPayload {
  careTaskId: string
}

/** Register the care-alert handler on the pg-boss instance. */
export function registerCareAlertHandler(boss: PgBoss) {
  boss.work<CareAlertPayload>(JOB_NAME, async (jobs) => {
    // pg-boss v10+ passes an array; we process one at a time.
    for (const job of Array.isArray(jobs) ? jobs : [jobs]) {
    const db = getDb()
    const [task] = await db.select().from(careTasks)
      .where(eq(careTasks.id, job.data.careTaskId))
      .limit(1)

    if (!task || task.state === 'done' || task.state === 'refused' || task.state === 'skipped') {
      log.debug({ taskId: job.data.careTaskId }, 'care-alert: task already completed, skipping')
      return
    }

    // Resolve who is on shift RIGHT NOW — not who was on shift at creation
    // (data-model invariant 3). This queries approved shifts whose UTC window
    // contains now(). In production this is the on_shift_now view; here we
    // do the equivalent query inline.
    const now = new Date()
    const onShift = await db.select({ staffId: shiftClaims.staffId })
      .from(shiftClaims)
      .innerJoin(shifts, eq(shiftClaims.shiftId, shifts.id))
      .where(and(
        eq(shiftClaims.state, 'approved'),
        lte(shifts.windowStartUtc, now),
      ))
      .limit(1)

    const assignee = onShift[0]?.staffId ?? null

    // Update the task: mark as due and assign to the on-shift staffer
    await db.update(careTasks)
      .set({
        state: 'due',
        assignedStaffId: assignee,
      })
      .where(eq(careTasks.id, task.id))

    log.info({ taskId: task.id, label: task.label, assignee }, 'care-alert fired')

    // Push the alert: to the on-shift assignee, else every staffer — a med
    // alert must never fire into the void (data-model invariant 3).
    const [pet] = await db.select({ name: pets.name }).from(pets).where(eq(pets.id, task.petId)).limit(1)
    const payload = {
      title: `${task.label} — ${pet?.name ?? 'guest'}`,
      body: `Due ${fmtTime(task.scheduledLocalTime)} · tap to open the checklist`,
      tag: `care-task-${task.id}`,
      url: '/',
    }
    if (assignee) await pushToUsers([assignee], payload)
    else await pushToStaff(payload)
    } // end for
  })
}

/** Enqueue a deferred care-alert job for a specific task at its fire time. */
export async function enqueueCareAlert(boss: PgBoss, taskId: string, fireAt: Date) {
  await boss.send(JOB_NAME, { careTaskId: taskId }, {
    startAfter: fireAt,
    retryLimit: 3,
    retryDelay: 30,
  })
  log.debug({ taskId, fireAt: fireAt.toISOString() }, 'care-alert enqueued')
}

/** Startup catch-up sweep: find any tasks that are past-due but still
 *  scheduled (the worker was down when they should have fired), and
 *  immediately fire them. This prevents a VPS reboot from silently
 *  dropping a med alert — data-model risk #2. */
export async function catchUpSweep(boss: PgBoss) {
  const db = getDb()
  const now = new Date()

  const pastDue = await db.select().from(careTasks)
    .where(and(
      inArray(careTasks.state, ['scheduled', 'due']),
      lte(careTasks.nextFireUtc, now),
    ))

  if (pastDue.length === 0) {
    log.info('care-alert catch-up: no past-due tasks')
    return
  }

  log.warn({ count: pastDue.length }, 'care-alert catch-up: firing past-due tasks')

  for (const task of pastDue) {
    await boss.send(JOB_NAME, { careTaskId: task.id }, {
      retryLimit: 3,
      retryDelay: 30,
    })
  }
}

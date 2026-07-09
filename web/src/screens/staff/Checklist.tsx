import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Eyebrow } from '../../components/primitives'
import { AddTaskSheet } from './AddTaskSheet'
import {
  useCareTasks, usePetDetail, useReservations,
  useCompleteCareTask, useAddCareTask, type CareTask,
} from '../../lib/queries'
import { seedToday, parseTimeText } from '../../lib/roster'
import { fmtDate, fmtDateRange, fmtTime } from '../../lib/format'

function TaskRow({
  task,
  addedByYou,
  last,
  busy,
  onComplete,
}: {
  task: CareTask
  addedByYou: boolean
  last: boolean
  busy: boolean
  onComplete: () => void
}) {
  const done = task.state === 'done'
  const overdue = task.state === 'overdue'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
      }}
    >
      <button
        type="button"
        onClick={done || busy ? undefined : onComplete}
        aria-label={done ? `${task.label} — done` : `Mark ${task.label} done`}
        style={
          done
            ? {
                width: 24, height: 24, borderRadius: 7, border: 0, padding: 0, cursor: 'default',
                background: 'var(--lagoon-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }
            : {
                width: 24, height: 24, borderRadius: 7, padding: 0, cursor: 'pointer',
                border: '1.5px solid var(--border-strong)', background: 'var(--surface-card)', flex: 'none',
                opacity: busy ? 0.5 : 1,
              }
        }
      >
        {done && <Icon name="check" size={15} style={{ color: 'var(--foam-50)' }} />}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span
          style={
            done
              ? { fontSize: 14, color: 'var(--stone-400)', textDecoration: 'line-through' }
              : overdue
                ? { fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }
                : { fontSize: 14.5, color: 'var(--text-body)' }
          }
        >
          {task.dose ? `${task.label}` : task.label}
        </span>
        <span style={done ? { fontSize: 12, color: 'var(--stone-400)' } : { fontSize: 12.5, color: overdue ? 'var(--red-error)' : 'var(--text-muted)' }}>
          {done
            ? `${fmtTime(task.scheduledLocalTime)} · done`
            : overdue
              ? `${fmtTime(task.scheduledLocalTime)} · overdue`
              : fmtTime(task.scheduledLocalTime)}
        </span>
      </div>
      {!done && addedByYou && <Badge tone="neutral">Added by you</Badge>}
    </div>
  )
}

export function DogChecklist({
  petId,
  onBack,
  go,
}: {
  petId: string | null
  onBack: () => void
  go: (r: 'report-builder', petId?: string) => void
}) {
  const allTasks = useCareTasks({})
  const today = seedToday(allTasks.data?.items)
  const petTasksQ = useCareTasks(petId ? { petId } : {})
  const detail = usePetDetail(petId)
  const reservationsQ = useReservations()
  const complete = useCompleteCareTask()
  const addTask = useAddCareTask()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const pet = detail.data
  const reservation = (reservationsQ.data?.items ?? []).find(
    (r) => r.pets.some((p) => p.id === petId) && r.status !== 'cancelled' && r.status !== 'denied',
  )

  const tasks = (petTasksQ.data?.items ?? [])
    .filter((t) => t.scheduledDate === today)
    .sort((a, b) => a.nextFireUtc.localeCompare(b.nextFireUtc))

  const onAdd = (label: string, whenText: string, kind: 'feeding' | 'medication' | 'task') => {
    if (!petId || !reservation) return
    const localTime = parseTimeText(whenText) ?? '12:00'
    addTask.mutate(
      {
        petId,
        reservationId: reservation.id,
        kind,
        label,
        scheduledDate: today,
        scheduled: { localTime, timeZone: reservation.timeZone },
      },
      {
        onSuccess: (created) => {
          const id = (created as { id?: string })?.id
          if (id) setAddedIds((s) => new Set(s).add(id))
          setSheetOpen(false)
        },
      },
    )
  }

  return (
    <>
      {/* Dog header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div
          style={{
            width: 44, height: 44, borderRadius: 999, background: 'var(--seaglass-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-500)', flex: 'none',
          }}
        >
          <Icon name="dog" size={22} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>
            {pet?.name ?? '…'}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {[
              pet?.breed,
              reservation ? fmtDateRange(reservation.startDate, reservation.endDate) : null,
              reservation ? `owner ${reservation.customerName}` : null,
            ].filter(Boolean).join(' · ')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => go('report-builder', petId ?? undefined)}
          aria-label="Build report card"
          style={{
            width: 38, height: 38, borderRadius: 999, border: 0, cursor: 'pointer',
            background: 'var(--surface-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-700)', padding: 0,
          }}
        >
          <Icon name="camera" size={17} />
        </button>
      </div>

      {/* Medical / behavior note */}
      {pet?.behaviorNotes && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)',
            padding: '11px 14px', fontSize: 13, color: 'var(--biscuit-700)',
          }}
        >
          <Icon name="triangle-alert" size={16} style={{ marginTop: 1, flex: 'none' }} />
          <span>{pet.behaviorNotes}</span>
        </div>
      )}

      {/* Day header + add task */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>Today · {fmtDate(today)}</Eyebrow>
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setSheetOpen(true)} disabled={!reservation}>
          Add task
        </Button>
      </div>

      {/* Checklist */}
      <div
        style={{
          background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '4px 16px',
        }}
      >
        {tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            task={t}
            addedByYou={addedIds.has(t.id)}
            last={i === tasks.length - 1}
            busy={complete.isPending}
            onComplete={() => complete.mutate({ id: t.id, body: { outcome: 'given' } })}
          />
        ))}
        {tasks.length === 0 && !petTasksQ.isLoading && (
          <div style={{ padding: '12px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
            Nothing on the rail today for this dog.
          </div>
        )}
      </div>

      <AddTaskSheet
        open={sheetOpen}
        petName={pet?.name ?? 'this dog'}
        pending={addTask.isPending}
        onClose={() => setSheetOpen(false)}
        onAdd={onAdd}
      />
    </>
  )
}

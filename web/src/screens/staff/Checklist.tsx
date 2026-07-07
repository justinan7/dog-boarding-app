import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Eyebrow } from '../../components/primitives'
import { AddTaskSheet } from './AddTaskSheet'

type Task = {
  id: number
  label: string
  time: string
  /** extra pending meta after the time, e.g. "due in 2h 11m" */
  metaExtra?: string
  doneAt?: string
  emphasis?: boolean
  muted?: boolean
  chevron?: boolean
  addedByYou?: boolean
}

const INITIAL_TASKS: Task[] = [
  { id: 1, label: 'Breakfast, 1 cup', time: '6:00 AM', doneAt: '6:04' },
  { id: 2, label: 'Rimadyl 75 mg', time: '8:00 AM', doneAt: '8:07' },
  { id: 3, label: 'Lunch, ½ cup', time: '12:00 PM', metaExtra: 'due in 2h 11m', emphasis: true, chevron: true },
  { id: 4, label: 'Ear drops, both ears', time: '2:00 PM', chevron: true },
  { id: 5, label: 'Recheck hot spot on paw', time: '3:30 PM', addedByYou: true },
  { id: 6, label: 'Rimadyl 75 mg', time: '8:00 PM', metaExtra: 'evening staff', muted: true },
]

function nowClock() {
  const d = new Date()
  return `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')}`
}

function TaskRow({ task, last, onToggle }: { task: Task; last: boolean; onToggle: () => void }) {
  const done = task.doneAt !== undefined
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
        onClick={onToggle}
        aria-label={done ? `${task.label} — done` : `Mark ${task.label} done`}
        style={
          done
            ? {
                width: 24, height: 24, borderRadius: 7, border: 0, padding: 0, cursor: 'pointer',
                background: 'var(--lagoon-700)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }
            : {
                width: 24, height: 24, borderRadius: 7, padding: 0, cursor: 'pointer',
                border: '1.5px solid var(--border-strong)', background: 'var(--surface-card)', flex: 'none',
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
              : task.emphasis
                ? { fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }
                : { fontSize: 14.5, color: task.muted ? 'var(--text-muted)' : 'var(--text-body)' }
          }
        >
          {task.label}
        </span>
        <span style={done ? { fontSize: 12, color: 'var(--stone-400)' } : { fontSize: 12.5, color: 'var(--text-muted)' }}>
          {done
            ? `${task.time} · done ${task.doneAt} by you`
            : task.metaExtra
              ? `${task.time} · ${task.metaExtra}`
              : task.time}
        </span>
      </div>
      {!done && task.addedByYou && <Badge tone="neutral">Added by you</Badge>}
      {!done && task.chevron && <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-400)' }} />}
    </div>
  )
}

export function DogChecklist({ onBack }: { onBack: () => void; go: (r: 'report-builder') => void }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [sheetOpen, setSheetOpen] = useState(false)

  const toggle = (id: number) =>
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, doneAt: t.doneAt === undefined ? nowClock() : undefined } : t,
      ),
    )

  const addTask = (label: string, time: string) => {
    setTasks((ts) => [...ts, { id: Math.max(0, ...ts.map((t) => t.id)) + 1, label, time, addedByYou: true }])
    setSheetOpen(false)
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
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>Bella</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Golden · Jul 3 – 7 · owner Sarah M</span>
        </div>
        <div
          style={{
            width: 38, height: 38, borderRadius: 999, background: 'var(--surface-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-700)',
          }}
        >
          <Icon name="message-circle" size={17} />
        </div>
      </div>

      {/* Medical note */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)',
          padding: '11px 14px', fontSize: 13, color: 'var(--biscuit-700)',
        }}
      >
        <Icon name="triangle-alert" size={16} style={{ marginTop: 1, flex: 'none' }} />
        <span>Arthritis — always give medication with food.</span>
      </div>

      {/* Day header + add task */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>Today · Sat Jul 5</Eyebrow>
        <Button variant="secondary" size="sm" icon="plus" onClick={() => setSheetOpen(true)}>
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
          <TaskRow key={t.id} task={t} last={i === tasks.length - 1} onToggle={() => toggle(t.id)} />
        ))}
      </div>

      <AddTaskSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addTask} />
    </>
  )
}

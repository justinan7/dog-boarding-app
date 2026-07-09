import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Button, Section, Sheet, Switch } from '../../components/primitives'

/* ---------- Tag (local — matches DS Tag: selectable pill, optional icon) ---------- */
function Tag({
  children,
  icon,
  selected,
  onClick,
}: {
  children: React.ReactNode
  icon?: IconName
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 34,
        padding: '0 14px',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 999,
        background: selected ? 'var(--lagoon-700)' : 'var(--surface-card)',
        color: selected ? 'var(--foam-50)' : 'var(--text-body)',
        border: selected ? '1px solid var(--lagoon-700)' : '1px solid var(--border-subtle)',
        transition: 'all var(--dur-fast) var(--ease-out)',
      }}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  )
}

/* ---------- Input (local — matches DS Input: label + value in a bordered field) ---------- */
function Field({
  label,
  value,
  onChange,
  icon,
  style,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  icon?: IconName
  style?: React.CSSProperties
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <Icon name={icon} size={16} style={{ color: 'var(--stone-400)', flex: 'none' }} />}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 'none',
            background: 'none',
            padding: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-heading)',
          }}
        />
      </span>
    </label>
  )
}

const TYPES: { label: string; icon: IconName; kind: 'feeding' | 'medication' | 'task' }[] = [
  { label: 'Med', icon: 'pill', kind: 'medication' },
  { label: 'Feed', icon: 'utensils', kind: 'feeding' },
  { label: 'Walk', icon: 'paw-print', kind: 'task' },
  { label: 'Check', icon: 'clipboard-check', kind: 'task' },
]

export function AddTaskSheet({
  open,
  petName,
  pending,
  onClose,
  onAdd,
}: {
  open: boolean
  petName: string
  pending?: boolean
  onClose: () => void
  onAdd: (label: string, whenText: string, kind: 'feeding' | 'medication' | 'task') => void
}) {
  const [repeats, setRepeats] = useState('One time')
  const [task, setTask] = useState('Recheck hot spot on paw')
  const [when, setWhen] = useState('3:30 PM today')
  const [type, setType] = useState('Check')
  const [alertStaff, setAlertStaff] = useState(true)

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 34, height: 34, borderRadius: 999, flex: 'none',
              background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="dog" size={17} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>
            Add a task for {petName}
          </span>
        </div>

        {/* Repeats */}
        <Section label="Repeats">
          <div style={{ display: 'flex', gap: 8 }}>
            {['One time', 'Daily this stay'].map((o) => (
              <Tag key={o} selected={repeats === o} onClick={() => setRepeats(o)}>
                {o}
              </Tag>
            ))}
          </div>
        </Section>

        {/* Task */}
        <Field label="Task" value={task} onChange={setTask} />

        {/* When */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="When" value={when} onChange={setWhen} icon="clock" style={{ flex: 1 }} />
        </div>

        {/* Type */}
        <Section label="Type">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPES.map((t) => (
              <Tag key={t.label} icon={t.icon} selected={type === t.label} onClick={() => setType(t.label)}>
                {t.label}
              </Tag>
            ))}
          </div>
        </Section>

        {/* Alert toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--text-body)' }}>Alert on-shift staff at task time</span>
          <Switch checked={alertStaff} onChange={setAlertStaff} />
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={pending || !task.trim()}
          onClick={() => {
            const kind = TYPES.find((t) => t.label === type)?.kind ?? 'task'
            onAdd(task.trim(), when, kind)
          }}
        >
          {pending ? 'Adding…' : 'Add to checklist'}
        </Button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Logged with your name and time — visible to management.
        </div>
      </div>
    </Sheet>
  )
}

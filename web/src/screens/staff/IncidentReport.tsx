import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { Section, Switch, Button } from '../../components/primitives'

/* ---------- Tag (local — matches DS Tag: 34px pill, selected = lagoon fill) ---------- */
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
      {icon && <Icon name={icon} size={15} />}
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

/* ---------- Textarea variant of the DS Input ("What happened") ---------- */
function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          border: 0,
          outline: 'none',
          background: 'none',
          padding: 0,
          resize: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          lineHeight: 1.45,
          color: 'var(--text-heading)',
        }}
      />
    </label>
  )
}

/* ---------- Checklist row (actions taken) ---------- */
function CheckRow({
  label,
  checked,
  onToggle,
  last,
}: {
  label: string
  checked: boolean
  onToggle: () => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 0',
        width: '100%',
        border: 0,
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-body)',
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      {checked ? (
        <span
          style={{
            width: 22, height: 22, borderRadius: 7, background: 'var(--lagoon-700)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}
        >
          <Icon name="check" size={13} style={{ color: 'var(--foam-50)' }} />
        </span>
      ) : (
        <span style={{ width: 22, height: 22, borderRadius: 7, border: '1.5px solid var(--border-strong)', flex: 'none' }} />
      )}
      <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{label}</span>
    </button>
  )
}

const TYPES = ['Injury', 'Bite', 'Escape', 'Illness', 'Other']
const SEVERITIES = ['Minor', 'Moderate', 'Severe']
const DOGS = ['Max', 'Cooper']
const ACTIONS = ['Separated the dogs', 'First aid given', 'Vet contacted']

export function IncidentReport({ onBack }: { onBack: () => void }) {
  const [type, setType] = useState('Bite')
  const [dogs, setDogs] = useState<string[]>(['Max'])
  const [when, setWhen] = useState('1:42 PM today')
  const [severity, setSeverity] = useState('Moderate')
  const [description, setDescription] = useState(
    'Max nipped at Cooper during feeding. No broken skin. Separated both immediately.',
  )
  const [actions, setActions] = useState<string[]>(['Separated the dogs'])
  const [notifyOwner, setNotifyOwner] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const toggleDog = (name: string) =>
    setDogs((d) => (d.includes(name) ? d.filter((x) => x !== name) : [...d, name]))
  const toggleAction = (label: string) =>
    setActions((a) => (a.includes(label) ? a.filter((x) => x !== label) : [...a, label]))

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Close"
        >
          <Icon name="x" size={22} />
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-heading)' }}>
            Report an incident
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Autosaving · Sat Jul 5</span>
        </div>
      </div>

      {/* Type */}
      <Section label="Type">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <Tag key={t} selected={type === t} onClick={() => setType(t)}>
              {t}
            </Tag>
          ))}
        </div>
      </Section>

      {/* Dogs involved */}
      <Section label="Dogs involved">
        <div style={{ display: 'flex', gap: 8 }}>
          {DOGS.map((d) => (
            <Tag key={d} icon="dog" selected={dogs.includes(d)} onClick={() => toggleDog(d)}>
              {d}
            </Tag>
          ))}
          <Tag icon="plus" selected={false} onClick={() => {}}>
            Add
          </Tag>
        </div>
      </Section>

      {/* When */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="When" value={when} onChange={setWhen} icon="clock" style={{ flex: 1 }} />
      </div>

      {/* Severity */}
      <Section label="Severity">
        <div style={{ display: 'flex', gap: 8 }}>
          {SEVERITIES.map((s) => (
            <Tag key={s} selected={severity === s} onClick={() => setSeverity(s)}>
              {s}
            </Tag>
          ))}
        </div>
      </Section>

      {/* What happened */}
      <TextAreaField label="What happened" value={description} onChange={setDescription} />

      {/* Photos */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--seaglass-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lagoon-300)',
          }}
        >
          <Icon name="image" size={20} />
        </div>
        <div
          style={{
            width: 56, height: 56, borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--stone-400)',
          }}
        >
          <Icon name="plus" size={20} />
        </div>
      </div>

      {/* Actions taken */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '4px 16px',
        }}
      >
        {ACTIONS.map((a, i) => (
          <CheckRow
            key={a}
            label={a}
            checked={actions.includes(a)}
            onToggle={() => toggleAction(a)}
            last={i === ACTIONS.length - 1}
          />
        ))}
      </div>

      {/* Notify owner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--text-body)' }}>Notify owner now</span>
        <Switch checked={notifyOwner} onChange={setNotifyOwner} />
      </div>

      {/* Submit */}
      {submitted ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '16px 20px', borderRadius: 999,
            background: '#DCEEE4', color: 'var(--green-success)',
            fontSize: 15, fontWeight: 600,
          }}
        >
          <Icon name="check" size={18} />
          Submitted — management alerted
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          style={{ background: 'var(--coral-500)' }}
          onClick={() => setSubmitted(true)}
        >
          Submit — alerts management
        </Button>
      )}
    </>
  )
}

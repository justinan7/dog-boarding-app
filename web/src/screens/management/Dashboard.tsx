import { Icon } from '../../components/Icon'
import { Wordmark, Section, Card, Button, Chip, DogAvatar } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useReservations, useCareTasks, useThreads } from '../../lib/queries'

const CAPACITY = 8

function AccountChip({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 999, padding: '4px 11px 4px 4px' }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--biscuit-300)', color: 'var(--biscuit-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="user-round" size={14} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={13} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

/** 'HH:MM' (24h) → '4:00 PM'. */
function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = (h ?? 0) >= 12 ? 'PM' : 'AM'
  const h12 = ((h ?? 0) % 12) || 12
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

const IN_RESIDENCE = ['in_stay', 'checked_in']

export function Dashboard() {
  const { user } = useAuth()
  const reservations = useReservations()
  const overdue = useCareTasks({ state: 'overdue' })
  const upcoming = useCareTasks({ state: 'scheduled' })
  const requested = useReservations('requested')
  const unanswered = useThreads('unanswered')

  const inResidence = (reservations.data?.items ?? []).filter((r) => IN_RESIDENCE.includes(r.status))
  const residentPets = inResidence.flatMap((r) => r.petNames)
  const overdueTask = overdue.data?.items?.[0]
  const boardTasks = (upcoming.data?.items ?? []).slice(0, 5)

  const bookings = requested.data?.items.length ?? 0
  const messages = unanswered.data?.items.length ?? 0

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <>
      {/* Header */}
      <div className="z-row-btwn" style={{ gap: 8 }}>
        <Wordmark size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-tint)', color: 'var(--lagoon-700)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 600 }}>
            {residentPets.length} / {CAPACITY} suites
          </span>
          <AccountChip name={user?.name ?? 'Manager'} />
        </div>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, color: 'var(--text-heading)' }}>{today}</div>
        {overdueTask?.assigneeDisplay && (
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>On shift: {overdueTask.assigneeDisplay}</div>
        )}
      </div>

      {/* Approval-count pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {bookings > 0 && <Chip tone="gold">{bookings} booking{bookings === 1 ? '' : 's'}</Chip>}
        {messages > 0 && <Chip tone="gold">{messages} message{messages === 1 ? '' : 's'}</Chip>}
      </div>

      {/* Overdue */}
      {overdueTask && (
        <Section label="Overdue" labelColor="var(--red-error)">
          <Card accent="coral" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DogAvatar size={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{overdueTask.petName} · {overdueTask.label}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Due {fmtTime(overdueTask.scheduledLocalTime)}{overdueTask.assigneeDisplay ? ` · assigned to ${overdueTask.assigneeDisplay}` : ''}
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--coral-500)', color: 'var(--foam-50)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700 }}>
                Overdue
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="sm" style={{ flex: 1 }}>Ping</Button>
              <Button variant="secondary" size="sm" style={{ flex: 1 }}>Reassign</Button>
            </div>
          </Card>
        </Section>
      )}

      {/* Live board */}
      {boardTasks.length > 0 && (
        <Section label="Live board">
          <Card style={{ padding: '4px 16px' }}>
            {boardTasks.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < boardTasks.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                <DogAvatar size={30} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-body)' }}>{t.petName} · {t.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(t.scheduledLocalTime)}</span>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t.assigneeDisplay ?? '—'}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* In residence */}
      {residentPets.length > 0 && (
        <Section label="In residence">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {residentPets.map((name, i) => (
              <Chip key={`${name}-${i}`} tone="lagoon" leading={<DogAvatar size={22} />}>{name}</Chip>
            ))}
          </div>
        </Section>
      )}

    </>
  )
}

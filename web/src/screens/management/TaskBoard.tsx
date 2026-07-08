import { Icon } from '../../components/Icon'
import { Section, Card, Button, Badge, DogAvatar } from '../../components/primitives'
import { useCareTasks, useCompleteCareTask, type CareTask } from '../../lib/queries'
import { fmtTime, fmtTimeCompact } from '../../lib/format'

const DONE_STATES = ['done', 'refused', 'skipped']
const UPCOMING_STATES = ['scheduled', 'due']

export function TaskBoard() {
  const tasks = useCareTasks({})
  const complete = useCompleteCareTask()

  const all: CareTask[] = tasks.data?.items ?? []
  const overdue = all.filter((t) => t.state === 'overdue')
  const upcoming = all.filter((t) => UPCOMING_STATES.includes(t.state))
  const done = all.filter((t) => DONE_STATES.includes(t.state))
  const total = all.length
  const overdueTask = overdue[0]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <>
      {/* Header */}
      <div className="z-row-btwn">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>Task board</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{today}</span>
        </div>
        <Badge tone="lagoon">{done.length} / {total} done</Badge>
      </div>

      {/* Overdue */}
      {overdueTask && (
        <Section label="Overdue" labelColor="var(--red-error)">
          <Card accent="coral" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DogAvatar size={38} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{overdueTask.petName} · {overdueTask.label}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Due {fmtTime(overdueTask.scheduledLocalTime)}{overdueTask.assigneeDisplay ? ` · assigned ${overdueTask.assigneeDisplay}` : ''}
                </span>
              </div>
              <span style={{ background: 'var(--coral-500)', color: 'var(--foam-50)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700 }}>Overdue</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" style={{ flex: 1 }}>Ping</Button>
              <Button variant="secondary" size="sm" style={{ flex: 1 }}>Reassign</Button>
              <Button variant="ghost" size="sm" style={{ flex: 1 }}
                disabled={complete.isPending}
                onClick={() => complete.mutate({ id: overdueTask.id, body: { outcome: 'given', managerOverride: true } })}>
                Mark done*
              </Button>
            </div>
          </Card>
        </Section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section label="Upcoming">
          <Card style={{ padding: '4px 16px' }}>
            {upcoming.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < upcoming.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lagoon-700)', width: 52 }}>{fmtTimeCompact(t.scheduledLocalTime)}</span>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text-body)' }}>{t.petName} · {t.label}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* Done today */}
      {done.length > 0 && (
        <Section label="Done today">
          <Card style={{ padding: '4px 16px' }}>
            {done.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < done.length - 1 ? '1px solid var(--border-subtle)' : undefined }}>
                <Icon name="check" size={16} style={{ color: 'var(--green-success)', flex: 'none' }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text-body)' }}>{t.petName} · {t.label} · {fmtTimeCompact(t.scheduledLocalTime)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.assigneeDisplay ?? ''}</span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
        * A management override is flagged and written to the audit log.
      </div>
    </>
  )
}

import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Section } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useCareTasks, useReservations, useMyShifts, useReportCards, useCompleteCareTask } from '../../lib/queries'
import { seedToday, rosterDogs } from '../../lib/roster'
import { fmtDayLong, fmtTime, fmtTimeCompact } from '../../lib/format'

type Route = 'checklist' | 'roster' | 'incident' | 'shifts'

function StaffChip({ name }: { name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 999,
        padding: '4px 11px 4px 4px',
      }}
    >
      <div
        style={{
          width: 26, height: 26, borderRadius: 999,
          background: 'var(--tide-300)', color: 'var(--tide-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="user-round" size={14} />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
      <Icon name="chevron-down" size={13} style={{ color: 'var(--stone-400)' }} />
    </div>
  )
}

function HereNowRow({
  name,
  breed,
  status,
  last,
  onOpen,
}: {
  name: string
  breed: string
  status: React.ReactNode
  last?: boolean
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 34, height: 34, borderRadius: 999,
          background: 'var(--seaglass-200)', color: 'var(--lagoon-500)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        }}
      >
        <Icon name="dog" size={17} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>{name}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{breed}</span>
      </div>
      {status}
    </div>
  )
}

export function StaffToday({ go }: { go: (r: Route, petId?: string) => void }) {
  const { user } = useAuth()
  const tasksQ = useCareTasks({})
  const reservationsQ = useReservations()
  const myShifts = useMyShifts()
  const cards = useReportCards()
  const complete = useCompleteCareTask()

  const tasks = tasksQ.data?.items ?? []
  const today = seedToday(tasks)
  const dogs = rosterDogs(reservationsQ.data?.items, tasks, today)

  const dayTasks = tasks.filter((t) => t.scheduledDate === today)
  const openTasks = dayTasks
    .filter((t) => t.state === 'scheduled' || t.state === 'overdue')
    .sort((a, b) => (a.state === 'overdue' ? -1 : 1) - (b.state === 'overdue' ? -1 : 1) || a.nextFireUtc.localeCompare(b.nextFireUtc))
  const hero = openTasks[0]
  const heroDog = hero ? dogs.find((d) => d.petId === hero.petId) : undefined
  const doneCount = dayTasks.filter((t) => t.state === 'done').length

  // On-shift chip: my approved claim on today's shift, else any pending claim.
  const todayShift = (myShifts.data?.items ?? []).find(
    (s) => s.shift.windowDate === today && s.claim.state === 'approved',
  )
  const pendingClaim = (myShifts.data?.items ?? []).find((s) => s.claim.state === 'pending')

  const sentCards = (cards.data?.items ?? []).filter((c) => c.status === 'sent').length
  const firstName = (user?.name ?? 'You').split(' ')[0]

  return (
    <>
      {/* Shift status + staff switcher + SOS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'var(--surface-tint)', color: 'var(--lagoon-700)',
            borderRadius: 999, padding: '5px 13px',
            fontSize: 12.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: todayShift ? 'var(--green-success)' : 'var(--stone-400)' }} />
          {todayShift
            ? `On shift · ${fmtTimeCompact(todayShift.shift.windowStartLocal)} – ${fmtTimeCompact(todayShift.shift.windowEndLocal)}`
            : pendingClaim
              ? 'Claim pending approval'
              : 'Off shift'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StaffChip name={firstName ?? ''} />
          <button
            type="button"
            onClick={() => go('incident')}
            aria-label="Report incident"
            style={{
              width: 36, height: 36, borderRadius: 999, border: 0, cursor: 'pointer',
              background: 'var(--coral-200)', color: '#A94E33',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <Icon name="triangle-alert" size={17} />
          </button>
        </div>
      </div>

      {/* Date */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.05, color: 'var(--text-heading)' }}>
          {fmtDayLong(today)}
        </div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          {dogs.length} guest{dogs.length === 1 ? '' : 's'} in residence · {openTasks.length} task{openTasks.length === 1 ? '' : 's'} left today
        </div>
      </div>

      {/* Next up hero */}
      {hero && (
        <Section label="Next up" labelColor="var(--accent-gold)">
          <div
            style={{
              background: 'var(--surface-inverse)',
              borderRadius: 'var(--radius-xl)',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 999,
                  background: 'var(--seaglass-200)', color: 'var(--lagoon-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}
              >
                <Icon name="dog" size={22} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--foam-50)' }}>{hero.label}</span>
                <span style={{ fontSize: 13.5, color: 'var(--seaglass-200)' }}>
                  {hero.petName}{heroDog?.breed ? ` · ${heroDog.breed}` : ''}
                </span>
              </div>
              <span
                style={
                  hero.state === 'overdue'
                    ? {
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--coral-500)', color: 'var(--foam-50)',
                        borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700,
                      }
                    : {
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'var(--biscuit-500)', color: 'var(--lagoon-900)',
                        borderRadius: 999, padding: '5px 12px', fontSize: 12.5, fontWeight: 700,
                      }
                }
              >
                {hero.state === 'overdue' ? 'Overdue' : `Due ${fmtTime(hero.scheduledLocalTime)}`}
              </span>
            </div>
            <Button
              variant="gold"
              size="md"
              fullWidth
              disabled={complete.isPending}
              onClick={() => complete.mutate({ id: hero.id, body: { outcome: 'given' } })}
            >
              {complete.isPending ? 'Logging…' : 'Log it'}
            </Button>
          </div>
        </Section>
      )}

      {/* Here now */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--stone-600)',
            }}
          >
            Here now · {dogs.length} dog{dogs.length === 1 ? '' : 's'}
          </span>
          <span
            onClick={() => go('roster')}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)', cursor: 'pointer' }}
          >
            See all
          </span>
        </div>
        <Card style={{ padding: '4px 16px' }}>
          {dogs.map((d, i) => (
            <HereNowRow
              key={d.petId}
              name={d.name}
              breed={d.breed ?? ''}
              last={i === dogs.length - 1}
              onOpen={() => go('checklist', d.petId)}
              status={
                d.overdue > 0 ? (
                  <Badge tone="error">Overdue</Badge>
                ) : d.due > 0 ? (
                  <Badge tone="gold">{d.due} due</Badge>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--green-success)', fontWeight: 600 }}>
                    <Icon name="check" size={15} />
                    Done
                  </span>
                )
              }
            />
          ))}
          {dogs.length === 0 && !reservationsQ.isLoading && (
            <div style={{ padding: '11px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>
              No dogs in residence right now.
            </div>
          )}
        </Card>
      </div>

      {/* Today's progress */}
      <div
        style={{
          background: 'var(--surface-tint)',
          borderRadius: 'var(--radius-lg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lagoon-700)' }}>Today's progress</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doneCount} of {dayTasks.length} tasks</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: 'var(--white)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${dayTasks.length > 0 ? Math.round((doneCount / dayTasks.length) * 100) : 0}%`,
              height: '100%',
              background: 'var(--lagoon-500)',
            }}
          />
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {sentCards} report card{sentCards === 1 ? '' : 's'} sent · photo uploads coming with storage
        </div>
      </div>
    </>
  )
}

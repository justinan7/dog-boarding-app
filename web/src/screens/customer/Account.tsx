import { Icon, type IconName } from '../../components/Icon'
import { Card } from '../../components/primitives'

// Account tab — not part of the hi-fi screen set. Per the design README,
// customers get Profile / Payments / Sign out (no role switch). Kept to the
// management "More" menu idiom until a hi-fi lands.
function Row({ icon, label, last }: { icon: IconName; label: string; last?: boolean }) {
  return (
    <button
      type="button"
      style={{
        width: '100%', border: 0, background: 'none', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
        borderBottom: last ? undefined : '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--surface-tint)', color: 'var(--lagoon-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-heading)' }}>{label}</span>
      <Icon name="chevron-right" size={18} style={{ color: 'var(--stone-400)' }} />
    </button>
  )
}

export function CustomerAccount() {
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Account</span>

      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--seaglass-200)', color: 'var(--lagoon-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="user-round" size={22} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>Sarah Mitchell</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>sarah@example.com</span>
        </div>
      </Card>

      <Card style={{ padding: '4px 16px' }}>
        <Row icon="user-round" label="Profile" />
        <Row icon="credit-card" label="Payment methods" />
        <Row icon="bell" label="Notifications" />
        <Row icon="log-out" label="Sign out" last />
      </Card>
    </>
  )
}

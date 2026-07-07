import { Icon, type IconName } from '../../components/Icon'
import { Card, Button } from '../../components/primitives'
import type { ManagerRoute } from '../../lib/nav'

function MenuRow({
  icon, label, onClick, last,
}: {
  icon: IconName; label: string; onClick?: () => void; last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

export function More({
  onNavigate,
  onSwitchView,
}: {
  onNavigate: (route: ManagerRoute) => void
  onSwitchView?: () => void
}) {
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>More</span>
      <Card style={{ padding: '4px 16px' }}>
        <MenuRow icon="clipboard-check" label="Live task board" onClick={() => onNavigate('taskboard')} />
        <MenuRow icon="file-check" label="Reports & audit log" onClick={() => onNavigate('reports')} />
        <MenuRow icon="calendar-days" label="Staff schedule" />
        <MenuRow icon="paw-print" label="Customers & pets" />
        <MenuRow icon="eye" label="View as staff" onClick={onSwitchView} />
        <MenuRow icon="settings" label="Settings" last />
      </Card>
      <Button variant="secondary" size="md" icon="log-out" fullWidth>Sign out</Button>
    </>
  )
}

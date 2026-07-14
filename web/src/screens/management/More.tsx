import { Icon, type IconName } from '../../components/Icon'
import { Card, Button } from '../../components/primitives'
import { useAuth } from '../../lib/auth-context'
import { useAppConfig } from '../../lib/queries'
import type { ManagerRoute, Role } from '../../lib/nav'

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
  viewAs,
}: {
  onNavigate: (route: ManagerRoute) => void
  viewAs?: (r: Role) => void
}) {
  const { user, signOut } = useAuth()
  const config = useAppConfig()
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>More</span>
      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--seaglass-200)', color: 'var(--lagoon-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="user-round" size={22} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{user?.name ?? '—'}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{user?.email ?? ''}</span>
        </div>
      </Card>
      <Card style={{ padding: '4px 16px' }}>
        <MenuRow icon="clipboard-check" label="Live task board" onClick={() => onNavigate('taskboard')} />
        <MenuRow icon="file-check" label="Reports & audit log" onClick={() => onNavigate('reports')} />
        {user?.role === 'admin' && (
          <MenuRow icon="user-round" label="Users & roles" onClick={() => onNavigate('users')} />
        )}
        <MenuRow icon="paw-print" label="Staff view" onClick={() => viewAs?.('staff')} last={!config.data?.demoMode} />
        {config.data?.demoMode && (
          <MenuRow icon="eye" label="Customer view (demo)" onClick={() => viewAs?.('customer')} last />
        )}
      </Card>
      <Button variant="secondary" size="md" icon="log-out" fullWidth onClick={() => void signOut()}>Sign out</Button>
    </>
  )
}

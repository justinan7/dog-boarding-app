import { Sheet, Badge } from '../../components/primitives'
import { Icon } from '../../components/Icon'
import { useAuth } from '../../lib/auth-context'

type Role = 'staff' | 'manager'

function RoleCard({
  title,
  subtitle,
  selected,
  onClick,
  pin,
}: {
  title: string
  subtitle: string
  selected: boolean
  onClick: () => void
  pin?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        background: 'var(--surface-card)',
        border: selected ? '1.5px solid var(--lagoon-700)' : '1.5px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 22, height: 22, flex: 'none', marginTop: 1,
          borderRadius: 999,
          border: `1.5px solid ${selected ? 'var(--lagoon-700)' : 'var(--border-strong)'}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {selected && <span style={{ width: 12, height: 12, borderRadius: 999, background: 'var(--lagoon-700)' }} />}
      </span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{title}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</span>
      </div>
      {pin && <Badge tone="gold" icon="lock">PIN</Badge>}
    </button>
  )
}

function LinkRow({ icon, label, onClick }: { icon: 'settings' | 'log-out'; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', border: 0, background: 'none', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-body)', padding: 0,
      }}
    >
      <Icon name={icon} size={18} style={{ color: 'var(--stone-600)' }} />
      <span style={{ flex: 1, fontSize: 14.5 }}>{label}</span>
      {icon === 'settings' && <Icon name="chevron-right" size={17} style={{ color: 'var(--stone-400)' }} />}
    </button>
  )
}

export function AccountSheet({
  open,
  onClose,
  role,
  onSwitchRole,
}: {
  open: boolean
  onClose: () => void
  role: Role
  onSwitchRole: (r: Role) => void
}) {
  const { user, signOut } = useAuth()
  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 52, height: 52, borderRadius: 999, flex: 'none',
              background: 'var(--tide-300)', color: 'var(--tide-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="user-round" size={24} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-heading)' }}>{user?.name ?? '—'}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email ?? ''}</span>
          </div>
        </div>

        <div className="z-divider" />
        <span className="z-eyebrow">View as</span>

        <RoleCard
          title="Staff"
          subtitle="Today, shifts, dog checklists"
          selected={role === 'staff'}
          onClick={() => onSwitchRole('staff')}
        />
        <RoleCard
          title="Manager"
          subtitle="Approvals, oversight, reports"
          selected={role === 'manager'}
          onClick={() => onSwitchRole('manager')}
          pin
        />

        <div className="z-divider" />
        <LinkRow icon="settings" label="Profile & settings" />
        <LinkRow icon="log-out" label="Sign out" onClick={() => void signOut()} />
      </div>
    </Sheet>
  )
}

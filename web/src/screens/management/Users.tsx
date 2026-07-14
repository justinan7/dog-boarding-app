import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { Badge, Button, Card, Section } from '../../components/primitives'
import { useAdminUsers, useCreateAdminUser, useChangeUserRole, type AdminUser } from '../../lib/queries'

// Admin-only (system operator): who can log in, and as what. New people are
// invited by EMAIL — the role takes effect when that email signs up.

const ROLES: AdminUser['role'][] = ['customer', 'staff', 'manager', 'admin']

const ROLE_TONE: Record<AdminUser['role'], 'neutral' | 'lagoon' | 'gold' | 'success'> = {
  customer: 'neutral', staff: 'lagoon', manager: 'gold', admin: 'success',
}

function RolePicker({
  value,
  onPick,
  disabled,
}: {
  value: AdminUser['role']
  onPick: (r: AdminUser['role']) => void
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          onClick={() => onPick(r)}
          style={{
            cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            padding: '5px 12px', borderRadius: 999, textTransform: 'capitalize',
            background: value === r ? 'var(--lagoon-700)' : 'var(--surface-card)',
            color: value === r ? 'var(--foam-50)' : 'var(--text-body)',
            border: value === r ? '1px solid var(--lagoon-700)' : '1px solid var(--border-subtle)',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

export function Users({ onBack }: { onBack: () => void }) {
  const usersQ = useAdminUsers()
  const createUser = useCreateAdminUser()
  const changeRole = useChangeUserRole()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminUser['role']>('staff')
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const items = usersQ.data?.items ?? []
  const loadError = usersQ.error instanceof Error ? usersQ.error.message : null

  const add = () => {
    if (!email.trim() || !name.trim() || createUser.isPending) return
    setError(null)
    createUser.mutate(
      { email: email.trim(), name: name.trim(), role },
      {
        onSuccess: () => { setEmail(''); setName('') },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not add the user'),
      },
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px', fontSize: 14,
    fontFamily: 'var(--font-body)', border: '1.5px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)', background: 'var(--surface-card)',
    color: 'var(--text-body)', outline: 'none',
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--lagoon-700)', display: 'flex', padding: 0 }}
          aria-label="Back"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-heading)' }}>
            Users &amp; roles
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Invite by email — the role applies when they sign up
          </span>
        </div>
      </div>

      {loadError && (
        <div style={{ fontSize: 13, color: 'var(--biscuit-700)', background: 'var(--biscuit-200)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
          {loadError.includes('PIN') || loadError.includes('elevation')
            ? 'Admin actions need the manager PIN — re-open the Manager view to unlock.'
            : loadError}
        </div>
      )}

      {/* Add user */}
      <Section label="Add a person">
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inputStyle} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={inputStyle} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <RolePicker value={role} onPick={setRole} />
          {error && <div style={{ fontSize: 13, color: 'var(--red-error)' }}>{error}</div>}
          <Button variant="primary" size="md" fullWidth disabled={createUser.isPending || !email.trim() || !name.trim()} onClick={add}>
            {createUser.isPending ? 'Adding…' : 'Add user'}
          </Button>
        </Card>
      </Section>

      {/* Everyone */}
      <Section label={`People · ${items.length}`}>
        <Card style={{ padding: '4px 16px' }}>
          {items.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0',
                borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>
                    {u.displayName}
                    {!u.hasLogin && <span style={{ fontWeight: 400, color: 'var(--stone-400)' }}> · hasn't signed up yet</span>}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                </div>
                <span
                  onClick={() => setEditing(editing === u.id ? null : u.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                </span>
              </div>
              {editing === u.id && (
                <RolePicker
                  value={u.role}
                  disabled={changeRole.isPending}
                  onPick={(r) => {
                    if (r === u.role) { setEditing(null); return }
                    changeRole.mutate({ id: u.id, role: r }, {
                      onSuccess: () => setEditing(null),
                      onError: (e) => setError(e instanceof Error ? e.message : 'Role change failed'),
                    })
                  }}
                />
              )}
            </div>
          ))}
          {items.length === 0 && !usersQ.isLoading && !loadError && (
            <div style={{ padding: '12px 0', fontSize: 13.5, color: 'var(--text-muted)' }}>No users yet.</div>
          )}
        </Card>
      </Section>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
        Tap a role badge to change it. Every change is audit-logged.
      </div>
    </>
  )
}

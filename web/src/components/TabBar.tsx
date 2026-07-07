import { Icon, type IconName } from './Icon'
import type { Route, TabKey } from '../lib/nav'

const TABS: { key: TabKey; route: Route; icon: IconName; label: string; badge?: number }[] = [
  { key: 'dash', route: 'dash', icon: 'layout-dashboard', label: 'Dash' },
  { key: 'calendar', route: 'calendar', icon: 'calendar-days', label: 'Calendar' },
  { key: 'inbox', route: 'inbox', icon: 'inbox', label: 'Inbox', badge: 3 },
  { key: 'photos', route: 'photos', icon: 'images', label: 'Photos' },
  { key: 'more', route: 'more', icon: 'menu', label: 'More' },
]

export function TabBar({
  active,
  onNavigate,
}: {
  active: TabKey
  onNavigate: (route: Route) => void
}) {
  return (
    <nav className="z-tabbar">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className="z-tab"
          data-active={active === t.key}
          onClick={() => onNavigate(t.route)}
        >
          <Icon name={t.icon} size={21} />
          {t.badge != null && <span className="z-tab__badge">{t.badge}</span>}
          {t.label}
        </button>
      ))}
    </nav>
  )
}

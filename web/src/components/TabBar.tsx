import { Icon } from './Icon'
import type { TabDef } from '../lib/nav'

export function TabBar<R extends string>({
  tabs,
  active,
  onNavigate,
}: {
  tabs: TabDef<R>[]
  active: R
  onNavigate: (route: R) => void
}) {
  return (
    <nav className="z-tabbar">
      {tabs.map((t) => (
        <button
          key={t.route}
          type="button"
          className="z-tab"
          data-active={active === t.route}
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

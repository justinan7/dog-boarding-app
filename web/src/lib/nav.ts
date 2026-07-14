// Prototype navigation for the three role views (one PWA, one login — role
// switching via the account chip; Manager is PIN-gated).
import type { IconName } from '../components/Icon'

export type Role = 'customer' | 'staff' | 'manager'
/** Actual account roles — admin (system operator) renders the manager view. */
export type UserRole = Role | 'admin'

// ---- Customer: Home · Book · Messages · Pets · Account ----------------------
export type CustomerRoute =
  | 'home' | 'book' | 'messages' | 'pets' | 'account'
  | 'report-card' | 'story' | 'stay' | 'pay' // pushed from Home/tabs

// ---- Staff: Today · Shifts · Dogs · Messages · Me ---------------------------
export type StaffRoute =
  | 'today' | 'shifts' | 'roster' | 'messages' | 'me'
  | 'checklist' | 'report-builder' | 'incident' // pushed

// ---- Management: Dash · Calendar · Inbox · Photos · More --------------------
export type ManagerRoute =
  | 'dash' | 'calendar' | 'inbox' | 'photos' | 'more'
  | 'taskboard' | 'reports' | 'users' // under More ('users' is admin-only)

export interface TabDef<R extends string> {
  route: R
  icon: IconName
  label: string
  badge?: number
}

export const CUSTOMER_TABS: TabDef<CustomerRoute>[] = [
  { route: 'home', icon: 'house', label: 'Home' },
  { route: 'book', icon: 'calendar-days', label: 'Book' },
  { route: 'messages', icon: 'message-circle', label: 'Messages' },
  { route: 'pets', icon: 'paw-print', label: 'Pets' },
  { route: 'account', icon: 'user-round', label: 'Account' },
]

export const STAFF_TABS: TabDef<StaffRoute>[] = [
  { route: 'today', icon: 'sun', label: 'Today' },
  { route: 'shifts', icon: 'calendar-days', label: 'Shifts' },
  { route: 'roster', icon: 'paw-print', label: 'Dogs' },
  { route: 'messages', icon: 'message-circle', label: 'Messages' },
  { route: 'me', icon: 'user-round', label: 'Me' },
]

export const MANAGER_TABS: TabDef<ManagerRoute>[] = [
  { route: 'dash', icon: 'layout-dashboard', label: 'Dash' },
  { route: 'calendar', icon: 'calendar-days', label: 'Calendar' },
  { route: 'inbox', icon: 'inbox', label: 'Inbox' },
  { route: 'photos', icon: 'images', label: 'Photos' },
  { route: 'more', icon: 'menu', label: 'More' },
]

/** Which tab highlights for a pushed (non-tab) route. */
export function customerTab(route: CustomerRoute): CustomerRoute {
  if (route === 'report-card' || route === 'story' || route === 'stay') return 'home'
  if (route === 'pay') return 'account'
  return route
}
export function staffTab(route: StaffRoute): StaffRoute {
  if (route === 'checklist' || route === 'report-builder') return 'roster'
  if (route === 'incident') return 'today'
  return route
}
export function managerTab(route: ManagerRoute): ManagerRoute {
  if (route === 'taskboard' || route === 'reports' || route === 'users') return 'more'
  return route
}

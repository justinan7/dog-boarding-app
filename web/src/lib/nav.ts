// Prototype navigation. The 5 designed Management screens map onto the
// bottom-tab IA (Dash · Calendar · Inbox · Photos · More); the Task board and
// Reports screens live under "More" (they show More active in the hi-fi).
export type Route =
  | 'dash'
  | 'calendar'
  | 'inbox'
  | 'photos'
  | 'more'
  | 'taskboard'
  | 'reports'

export type TabKey = 'dash' | 'calendar' | 'inbox' | 'photos' | 'more'

export function tabForRoute(route: Route): TabKey {
  if (route === 'taskboard' || route === 'reports') return 'more'
  return route
}

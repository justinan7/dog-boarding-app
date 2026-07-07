import { useState, type CSSProperties } from 'react'
import { PhoneFrame } from './components/PhoneFrame'
import { TabBar } from './components/TabBar'
import { Dashboard } from './screens/Dashboard'
import { Calendar } from './screens/Calendar'
import { Inbox } from './screens/Inbox'
import { TaskBoard } from './screens/TaskBoard'
import { Reports } from './screens/Reports'
import { More } from './screens/More'
import { Photos } from './screens/Photos'
import { type Route, tabForRoute } from './lib/nav'

// Standard scrollable screens share the hi-fi content frame (64px top padding
// clears the notch; 16px section rhythm). Inbox is a full-screen thread.
const SCROLL_STYLE: CSSProperties = {
  padding: '64px 20px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

export default function App() {
  const [route, setRoute] = useState<Route>('dash')

  if (route === 'inbox') {
    return (
      <PhoneFrame>
        <Inbox onBack={() => setRoute('dash')} />
      </PhoneFrame>
    )
  }

  let content
  switch (route) {
    case 'calendar': content = <Calendar />; break
    case 'photos': content = <Photos />; break
    case 'more': content = <More onNavigate={setRoute} />; break
    case 'taskboard': content = <TaskBoard />; break
    case 'reports': content = <Reports />; break
    default: content = <Dashboard />
  }

  return (
    <PhoneFrame>
      <div className="z-phone__scroll" style={SCROLL_STYLE}>
        {content}
      </div>
      <TabBar active={tabForRoute(route)} onNavigate={setRoute} />
    </PhoneFrame>
  )
}

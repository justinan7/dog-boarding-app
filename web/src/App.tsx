import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { PhoneFrame } from './components/PhoneFrame'
import { TabBar } from './components/TabBar'
import { PinSheet } from './components/PinSheet'
import { Login } from './screens/Login'
import { useAuth } from './lib/auth-context'
import { Wordmark, Card, Button } from './components/primitives'
// management
import { Dashboard } from './screens/management/Dashboard'
import { Calendar } from './screens/management/Calendar'
import { Inbox } from './screens/management/Inbox'
import { TaskBoard } from './screens/management/TaskBoard'
import { Reports } from './screens/management/Reports'
import { More } from './screens/management/More'
import { Photos } from './screens/management/Photos'
// customer
import { CustomerHome } from './screens/customer/Home'
import { BookStay } from './screens/customer/Book'
import { ReportCardPostcard } from './screens/customer/ReportCard'
import { ReportCardStory } from './screens/customer/StoryView'
import { StayDetail } from './screens/customer/StayDetail'
import { CustomerMessages } from './screens/customer/Messages'
import { Payment } from './screens/customer/Payment'
import { PetProfile } from './screens/customer/PetProfile'
import { CustomerAccount } from './screens/customer/Account'
// staff
import { StaffToday } from './screens/staff/Today'
import { ShiftBoard } from './screens/staff/ShiftBoard'
import { DogChecklist } from './screens/staff/Checklist'
import { ReportCardBuilder } from './screens/staff/ReportCardBuilder'
import { DogRoster } from './screens/staff/DogRoster'
import { IncidentReport } from './screens/staff/IncidentReport'
import { StaffMessages } from './screens/staff/Messages'
import { AccountSheet } from './screens/staff/AccountSheet'
import { Icon } from './components/Icon'
import {
  CUSTOMER_TABS, STAFF_TABS, MANAGER_TABS,
  customerTab, staffTab, managerTab,
  type Role, type CustomerRoute, type StaffRoute, type ManagerRoute,
} from './lib/nav'
import { useRealtime } from './lib/realtime'
import { PushToggle } from './components/PushToggle'

// The hi-fi content frame: 64px top clears the notch, 16px section rhythm.
const SCROLL_STYLE: CSSProperties = {
  padding: '64px 20px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

/** Scrollable content + tab bar (the default screen wrapper). */
function TabScreen<R extends string>({
  tabs, active, onNavigate, children,
}: {
  tabs: typeof CUSTOMER_TABS | typeof STAFF_TABS | typeof MANAGER_TABS
  active: R
  onNavigate: (r: R) => void
  children: ReactNode
}) {
  return (
    <>
      <div className="z-phone__scroll" style={SCROLL_STYLE}>{children}</div>
      <TabBar tabs={tabs as never} active={active as never} onNavigate={onNavigate as never} />
    </>
  )
}

/** Full-screen screen (own header/footer) that keeps the tab bar below it. */
function FullWithTabs<R extends string>({
  tabs, active, onNavigate, children,
}: {
  tabs: typeof CUSTOMER_TABS | typeof STAFF_TABS | typeof MANAGER_TABS
  active: R
  onNavigate: (r: R) => void
  children: ReactNode
}) {
  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <TabBar tabs={tabs as never} active={active as never} onNavigate={onNavigate as never} />
    </>
  )
}

// ---------------------------------------------------------------------------
function CustomerView({ viewAs }: { viewAs: (r: Role) => void }) {
  const [route, setRoute] = useState<CustomerRoute>('home')
  // Which stay / report card a detail screen is looking at (set on navigation).
  const [stayId, setStayId] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)

  const go = (r: CustomerRoute, id?: string) => {
    if ((r === 'stay' || r === 'pay') && id) setStayId(id)
    if ((r === 'report-card' || r === 'story') && id) setCardId(id)
    setRoute(r)
  }

  if (route === 'story') return <ReportCardStory cardId={cardId} onClose={() => go('report-card')} />

  if (route === 'messages') {
    return (
      <FullWithTabs tabs={CUSTOMER_TABS} active={customerTab(route)} onNavigate={go}>
        <CustomerMessages />
      </FullWithTabs>
    )
  }

  let content: ReactNode
  switch (route) {
    case 'book': content = <BookStay />; break
    case 'pets': content = <PetProfile />; break
    case 'account': content = <CustomerAccount viewAs={viewAs} />; break
    case 'report-card': content = <ReportCardPostcard cardId={cardId} go={go} onBack={() => go('home')} />; break
    case 'stay': content = <StayDetail stayId={stayId} go={go} onBack={() => go('home')} />; break
    case 'pay': content = <Payment stayId={stayId} onBack={() => go('home')} />; break
    default: content = <CustomerHome go={go} />
  }
  return (
    <TabScreen tabs={CUSTOMER_TABS} active={customerTab(route)} onNavigate={go}>
      {content}
    </TabScreen>
  )
}

// ---------------------------------------------------------------------------
function StaffMe({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { user } = useAuth()
  return (
    <>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text-heading)' }}>Me</span>
      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--tide-300)', color: 'var(--tide-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Icon name="user-round" size={22} />
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{user?.name ?? '—'}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{user?.email ?? ''}</span>
        </div>
      </Card>
      <Button variant="secondary" fullWidth icon="user-round" onClick={onOpenAccount}>
        Account &amp; view options
      </Button>
      <PushToggle />
    </>
  )
}

function StaffView({ viewAs }: { viewAs: (r: Role) => void }) {
  const { refresh } = useAuth()
  const [route, setRoute] = useState<StaffRoute>('today')
  // Which dog the checklist / report-card builder is working on.
  const [petId, setPetId] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const go = (r: StaffRoute, id?: string) => {
    if ((r === 'checklist' || r === 'report-builder') && id) setPetId(id)
    setRoute(r)
  }

  // Messages owns its full frame (list + thread view, like customer messages).
  if (route === 'messages') {
    return (
      <FullWithTabs tabs={STAFF_TABS} active={staffTab(route)} onNavigate={go}>
        <StaffMessages />
      </FullWithTabs>
    )
  }

  let content: ReactNode
  switch (route) {
    case 'shifts': content = <ShiftBoard />; break
    case 'roster': content = <DogRoster go={go} />; break
    case 'me': content = <StaffMe onOpenAccount={() => setAccountOpen(true)} />; break
    case 'checklist': content = <DogChecklist petId={petId} onBack={() => go('roster')} go={go} />; break
    case 'report-builder': content = <ReportCardBuilder petId={petId} onBack={() => go('checklist')} />; break
    case 'incident': content = <IncidentReport onBack={() => go('today')} />; break
    default: content = <StaffToday go={go} />
  }

  return (
    <>
      <TabScreen tabs={STAFF_TABS} active={staffTab(route)} onNavigate={go}>
        {content}
      </TabScreen>
      <AccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        role="staff"
        onSwitchRole={(r) => {
          setAccountOpen(false)
          if (r === 'manager') setPinOpen(true)
          else if (r === 'customer') viewAs('customer')
        }}
      />
      <PinSheet
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onUnlock={() => {
          setPinOpen(false)
          // Pull the fresh elevation state (managerElevatedUntil) before the
          // manager view mounts, so it doesn't re-prompt.
          void refresh()
          viewAs('manager')
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
function ManagerView({ viewAs }: { viewAs: (r: Role) => void }) {
  const [route, go] = useState<ManagerRoute>('dash')
  const { user, refresh } = useAuth()

  // The M🔒 endpoints (approvals, reports, oversight) need a live server-side
  // elevation. Prompt for the PIN once when a staff/manager lands here without
  // one. Customers can dismiss it — they get the view, not the powers.
  const elevated = !!user?.managerElevatedUntil && new Date(user.managerElevatedUntil) > new Date()
  const canElevate = user?.role === 'staff' || user?.role === 'manager'
  const [pinOpen, setPinOpen] = useState(false)
  const [prompted, setPrompted] = useState(false)
  useEffect(() => {
    if (user && canElevate && !elevated && !prompted) {
      setPinOpen(true)
      setPrompted(true)
    }
  }, [user, canElevate, elevated, prompted])

  const pinSheet = (
    <PinSheet
      open={pinOpen}
      onClose={() => setPinOpen(false)}
      onUnlock={() => { setPinOpen(false); void refresh() }}
    />
  )

  if (route === 'inbox') {
    return (
      <>
        <FullWithTabs tabs={MANAGER_TABS} active={managerTab(route)} onNavigate={go}>
          <Inbox onBack={() => go('dash')} />
        </FullWithTabs>
        {pinSheet}
      </>
    )
  }

  let content: ReactNode
  switch (route) {
    case 'calendar': content = <Calendar />; break
    case 'photos': content = <Photos />; break
    case 'more': content = <More onNavigate={go} viewAs={viewAs} />; break
    case 'taskboard': content = <TaskBoard />; break
    case 'reports': content = <Reports />; break
    default: content = <Dashboard />
  }
  return (
    <>
      <TabScreen tabs={MANAGER_TABS} active={managerTab(route)} onNavigate={go}>
        {content}
      </TabScreen>
      {pinSheet}
    </>
  )
}

// ---------------------------------------------------------------------------
export default function App() {
  const { user, loading } = useAuth()
  useRealtime() // live cache invalidation via Centrifugo (no-op when unconfigured)
  // Default role from the auth context; the account-screen "view as" (demo
  // mode) can override which view renders — the API enforces the real role.
  const [role, setRole] = useState<Role>('customer')

  // When the auth user loads, set the role from the server.
  useEffect(() => {
    if (user) setRole(user.role as Role)
  }, [user])

  if (loading) {
    return (
      <PhoneFrame>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wordmark size={42} />
        </div>
      </PhoneFrame>
    )
  }

  if (!user) {
    return (
      <PhoneFrame>
        <Login />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      {role === 'customer' && <CustomerView viewAs={setRole} />}
      {role === 'staff' && <StaffView viewAs={setRole} />}
      {role === 'manager' && <ManagerView viewAs={setRole} />}
    </PhoneFrame>
  )
}

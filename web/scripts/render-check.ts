/* Headless render check (run from web/: `npx tsx scripts/render-check.ts`
 * with the API live on :3000 and demo users signed up — see scripts/dev-local.sh): seed a QueryClient with LIVE API data, renderToString
 * every newly-wired Customer/Staff screen, assert the real data shows up. */
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const W = new URL('../src', import.meta.url).pathname
const API = 'http://localhost:3000'

// The seed anchors to TODAY (business tz America/Los_Angeles) — compute the
// same strings the screens will render.
const TZ = 'America/Los_Angeles'
const D0 = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const day = (offset: number) => {
  const [y, m, d] = D0.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + offset)).toISOString().slice(0, 10)
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const local = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y!, m! - 1, d!) }
const fmtDate = (ymd: string) => `${MONTHS[local(ymd).getMonth()]} ${local(ymd).getDate()}`
const fmtDayLong = (ymd: string) => `${WEEKDAYS[local(ymd).getDay()]}, ${fmtDate(ymd)}`
const fmtRange = (a: string, b: string) => {
  const s = local(a), e = local(b)
  return s.getMonth() === e.getMonth() ? `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}` : `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}
const CUR_MONTH_LABEL = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

async function signIn(email: string): Promise<string> {
  const res = await fetch(`${API}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email, password: 'Demo1234!' }),
  })
  const cookie = res.headers.get('set-cookie') ?? ''
  return cookie.split(';')[0] ?? ''
}

async function get(cookie: string, path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, { headers: { Cookie: cookie } })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json()
}

function render(node: unknown, qc: QueryClient, AuthProvider: any): string {
  const html = renderToString(
    h(QueryClientProvider, { client: qc } as any, h(AuthProvider, null, node as any)),
  )
  // React inserts <!-- --> between text nodes and escapes apostrophes — undo both
  return html.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
}

let failures = 0
function check(name: string, html: string, needles: string[]) {
  for (const n of needles) {
    if (html.includes(n)) console.log(`  ✓ ${name}: "${n}"`)
    else { console.log(`  ✗ ${name}: MISSING "${n}"`); failures++ }
  }
}

async function main() {
  const { AuthProvider } = await import(`${W}/lib/auth-context`)

  // ---- customer world (sarah) ----
  const sc = await signIn('sarah@example.com')
  const sQC = new QueryClient()
  const reservations = await get(sc, '/api/v1/reservations')
  sQC.setQueryData(['reservations', 'all'], reservations)
  const cards = await get(sc, '/api/v1/report-cards')
  sQC.setQueryData(['report-cards', {}], cards)
  const threads = (await get(sc, '/api/v1/threads')) as any
  sQC.setQueryData(['threads', 'all'], threads)
  const threadId = threads.items[0].id
  sQC.setQueryData(['thread-messages', threadId], await get(sc, `/api/v1/threads/${threadId}/messages`))
  const pets = (await get(sc, '/api/v1/pets')) as any
  sQC.setQueryData(['pets', 'all'], pets)
  for (const p of pets.items) {
    sQC.setQueryData(['pet', p.id], await get(sc, `/api/v1/pets/${p.id}`))
  }
  const stays = (reservations as any).items
  const rustyStay = stays.find((r: any) => r.petNames.includes('Rusty') && r.status === 'approved')
  sQC.setQueryData(['invoice', rustyStay.id], await get(sc, `/api/v1/invoices?reservationId=${rustyStay.id}`))
  sQC.setQueryData(['addons'], await get(sc, '/api/v1/addons'))
  {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth() + 1
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const to = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    sQC.setQueryData(['capacity', from, to], await get(sc, `/api/v1/capacity?from=${from}&to=${to}`))
  }

  const { CustomerHome } = await import(`${W}/screens/customer/Home`)
  const { StayDetail } = await import(`${W}/screens/customer/StayDetail`)
  const { BookStay } = await import(`${W}/screens/customer/Book`)
  const { CustomerMessages } = await import(`${W}/screens/customer/Messages`)
  const { PetProfile } = await import(`${W}/screens/customer/PetProfile`)
  const { ReportCardPostcard } = await import(`${W}/screens/customer/ReportCard`)
  const { Payment } = await import(`${W}/screens/customer/Payment`)

  const noop = () => {}
  console.log('— Customer —')
  check('Home', render(h(CustomerHome, { go: noop }), sQC, AuthProvider),
    ["Jag's stay", fmtRange(day(-1), day(3)), 'In residence', 'Book a stay'])
  check('StayDetail', render(h(StayDetail, { stayId: rustyStay.id, go: noop, onBack: noop }), sQC, AuthProvider),
    ["Rusty's stay", fmtRange(day(1), day(3)), 'Boarding · 2 nights', '$110', 'Bath before pick-up', '$95'])
  check('Book', render(h(BookStay, {}), sQC, AuthProvider),
    ['Rusty', 'Jag', CUR_MONTH_LABEL, 'Bath before pick-up', 'Extra playtime'])
  check('Messages', render(h(CustomerMessages, { onBack: noop }), sQC, AuthProvider),
    ['blue blanket', 'settling in beautifully', 'Zoomez concierge'])
  check('PetProfile', render(h(PetProfile, {}), sQC, AuthProvider),
    ['Rusty', 'Jag', 'Feeding & medication', 'Vaccinations', 'Rabies'])
  check('ReportCard', render(h(ReportCardPostcard, { cardId: null, go: noop, onBack: noop }), sQC, AuthProvider),
    ["'s day", 'made a friend today', 'Playful', 'Ate everything'])
  check('Payment', render(h(Payment, { stayId: rustyStay.id, onBack: noop }), sQC, AuthProvider),
    ['Boarding · 2 nights', 'Deposit, paid', '$40', '$95'])

  // ---- staff world (jack) ----
  const jc = await signIn('tyler@zoomez.app')
  const jQC = new QueryClient()
  const jRes = await get(jc, '/api/v1/reservations')
  jQC.setQueryData(['reservations', 'all'], jRes)
  const tasks = (await get(jc, '/api/v1/care-tasks')) as any
  jQC.setQueryData(['care-tasks', {}], tasks)
  const jag = tasks.items.find((t: any) => t.petName === 'Jag')
  jQC.setQueryData(['care-tasks', { petId: jag.petId }], await get(jc, `/api/v1/care-tasks?petId=${jag.petId}`))
  jQC.setQueryData(['pet', jag.petId], await get(jc, `/api/v1/pets/${jag.petId}`))
  jQC.setQueryData(['shifts', 'all'], await get(jc, '/api/v1/shifts'))
  jQC.setQueryData(['shifts-mine'], await get(jc, '/api/v1/shifts/mine'))
  jQC.setQueryData(['threads', 'all'], await get(jc, '/api/v1/threads'))
  jQC.setQueryData(['report-cards', {}], await get(jc, '/api/v1/report-cards'))

  const { Inbox } = await import(`${W}/screens/management/Inbox`)
  const { Photos } = await import(`${W}/screens/management/Photos`)
  const { More } = await import(`${W}/screens/management/More`)
  const { StaffToday } = await import(`${W}/screens/staff/Today`)
  const { DogRoster } = await import(`${W}/screens/staff/DogRoster`)
  const { DogChecklist } = await import(`${W}/screens/staff/Checklist`)
  const { ShiftBoard } = await import(`${W}/screens/staff/ShiftBoard`)
  const { StaffMessages } = await import(`${W}/screens/staff/Messages`)
  const { IncidentReport } = await import(`${W}/screens/staff/IncidentReport`)
  const { ReportCardBuilder } = await import(`${W}/screens/staff/ReportCardBuilder`)

  console.log('— Staff —')
  check('Today', render(h(StaffToday, { go: noop }), jQC, AuthProvider),
    [fmtDayLong(day(0)), 'in residence', 'Jag', 'Cooper', 'Jack', "Today's progress"])
  check('Roster', render(h(DogRoster, { go: noop }), jQC, AuthProvider),
    ['Dogs here now', 'Jag · Golden Retriever', 'Cooper · Lab mix', 'Jack · Boxer'])
  check('Checklist', render(h(DogChecklist, { petId: jag.petId, onBack: noop, go: noop }), jQC, AuthProvider),
    ['Jag', 'Insulin 4u', 'Arthritis', 'Add task'])
  check('ShiftBoard', render(h(ShiftBoard, {}), jQC, AuthProvider),
    [fmtDayLong(day(2)), '7:00a – 3:00p', '6 dogs', 'Claim shift', 'Maria'])
  check('StaffMessages', render(h(StaffMessages, {}), jQC, AuthProvider),
    ['Sarah Mitchell', 'Marcus Diaz', 'deposit refundable'])
  check('Incident', render(h(IncidentReport, { onBack: noop }), jQC, AuthProvider),
    ['Report an incident', 'Jag', 'Cooper', 'Jack', 'Severity'])
  check('CardBuilder', render(h(ReportCardBuilder, { petId: jag.petId, onBack: noop }), jQC, AuthProvider),
    ["Jag's card", 'Mood today', 'Send to owner', 'Care log auto-added'])

  console.log('— Management —')
  check('Inbox', render(h(Inbox, { onBack: noop }), jQC, AuthProvider),
    ['Inbox', 'Sarah Mitchell', 'Marcus Diaz', 'silent view'])
  check('Photos', render(h(Photos, {}), jQC, AuthProvider),
    ['Photos'])
  check('More', render(h(More, { onNavigate: noop, viewAs: noop }), jQC, AuthProvider),
    ['Live task board', 'Reports & audit log', 'Sign out'])

  console.log(failures === 0 ? '\nALL RENDER CHECKS PASSED' : `\n${failures} FAILURES`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })

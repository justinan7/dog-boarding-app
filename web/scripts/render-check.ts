/* Headless render check (run from web/: `npx tsx scripts/render-check.ts`
 * with the API live on :3000 and demo users signed up — see scripts/dev-local.sh): seed a QueryClient with LIVE API data, renderToString
 * every newly-wired Customer/Staff screen, assert the real data shows up. */
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const W = new URL('../src', import.meta.url).pathname
const API = 'http://localhost:3000'

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
  return html.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'")
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
  const biscuit = pets.items.find((p: any) => p.name === 'Biscuit')
  sQC.setQueryData(['pet', biscuit.id], await get(sc, `/api/v1/pets/${biscuit.id}`))
  const stays = (reservations as any).items
  const biscuitStay = stays.find((r: any) => r.petNames.includes('Biscuit') && r.startDate === '2026-07-04')
  sQC.setQueryData(['invoice', biscuitStay.id], await get(sc, `/api/v1/invoices?reservationId=${biscuitStay.id}`))
  sQC.setQueryData(['addons'], await get(sc, '/api/v1/addons'))
  sQC.setQueryData(['capacity', '2026-07-01', '2026-08-01'], await get(sc, '/api/v1/capacity?from=2026-07-01&to=2026-08-01'))

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
    ["Bella's stay", 'Jul 3 – 7', 'In residence', 'Book a stay'])
  check('StayDetail', render(h(StayDetail, { stayId: biscuitStay.id, go: noop, onBack: noop }), sQC, AuthProvider),
    ["Biscuit's stay", 'Jul 4 – 6', 'Boarding · 2 nights', '$110', 'Bath before pick-up', '$95'])
  check('Book', render(h(BookStay, {}), sQC, AuthProvider),
    ['Biscuit', 'Bella', 'July 2026', 'Bath before pick-up', 'Extra playtime'])
  check('Messages', render(h(CustomerMessages, { onBack: noop }), sQC, AuthProvider),
    ['blue blanket', 'settling in beautifully', 'Zoomez concierge'])
  check('PetProfile', render(h(PetProfile, {}), sQC, AuthProvider),
    ['Biscuit', 'Rimadyl 75 mg', '8:00 AM', 'Rabies', 'Bordetella', 'Expired'])
  check('ReportCard', render(h(ReportCardPostcard, { cardId: null, go: noop, onBack: noop }), sQC, AuthProvider),
    ["'s day", 'made a friend today', 'Playful', 'Ate everything'])
  check('Payment', render(h(Payment, { stayId: biscuitStay.id, onBack: noop }), sQC, AuthProvider),
    ['Boarding · 2 nights', 'Deposit, paid', '$40', '$95'])

  // ---- staff world (jack) ----
  const jc = await signIn('jack@zoomez.app')
  const jQC = new QueryClient()
  const jRes = await get(jc, '/api/v1/reservations')
  jQC.setQueryData(['reservations', 'all'], jRes)
  const tasks = (await get(jc, '/api/v1/care-tasks')) as any
  jQC.setQueryData(['care-tasks', {}], tasks)
  const bella = tasks.items.find((t: any) => t.petName === 'Bella')
  jQC.setQueryData(['care-tasks', { petId: bella.petId }], await get(jc, `/api/v1/care-tasks?petId=${bella.petId}`))
  jQC.setQueryData(['pet', bella.petId], await get(jc, `/api/v1/pets/${bella.petId}`))
  jQC.setQueryData(['shifts', 'all'], await get(jc, '/api/v1/shifts'))
  jQC.setQueryData(['shifts-mine'], await get(jc, '/api/v1/shifts/mine'))
  jQC.setQueryData(['threads', 'all'], await get(jc, '/api/v1/threads'))
  jQC.setQueryData(['report-cards', {}], await get(jc, '/api/v1/report-cards'))

  const { StaffToday } = await import(`${W}/screens/staff/Today`)
  const { DogRoster } = await import(`${W}/screens/staff/DogRoster`)
  const { DogChecklist } = await import(`${W}/screens/staff/Checklist`)
  const { ShiftBoard } = await import(`${W}/screens/staff/ShiftBoard`)
  const { StaffMessages } = await import(`${W}/screens/staff/Messages`)
  const { IncidentReport } = await import(`${W}/screens/staff/IncidentReport`)
  const { ReportCardBuilder } = await import(`${W}/screens/staff/ReportCardBuilder`)

  console.log('— Staff —')
  check('Today', render(h(StaffToday, { go: noop }), jQC, AuthProvider),
    ['Friday, Jul 3', 'in residence', 'Bella', 'Cooper', 'Max', "Today's progress"])
  check('Roster', render(h(DogRoster, { go: noop }), jQC, AuthProvider),
    ['Dogs here now', 'Bella · Golden Retriever', 'Cooper · Lab mix', 'Max · Boxer'])
  check('Checklist', render(h(DogChecklist, { petId: bella.petId, onBack: noop, go: noop }), jQC, AuthProvider),
    ['Bella', 'Insulin 4u', 'Arthritis', 'Add task'])
  check('ShiftBoard', render(h(ShiftBoard, {}), jQC, AuthProvider),
    ['Monday, Jul 6', '7:00a – 3:00p', '6 dogs', 'Claim shift', 'Maria'])
  check('StaffMessages', render(h(StaffMessages, {}), jQC, AuthProvider),
    ['Sarah Mitchell', 'Marcus Diaz', 'extra walk added'])
  check('Incident', render(h(IncidentReport, { onBack: noop }), jQC, AuthProvider),
    ['Report an incident', 'Bella', 'Cooper', 'Max', 'Severity'])
  check('CardBuilder', render(h(ReportCardBuilder, { petId: bella.petId, onBack: noop }), jQC, AuthProvider),
    ["Bella's card", 'Mood today', 'Send to owner', 'Care log auto-added'])

  console.log(failures === 0 ? '\nALL RENDER CHECKS PASSED' : `\n${failures} FAILURES`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })

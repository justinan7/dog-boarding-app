// Concurrency invariant check — run against a REAL multi-connection Postgres
// (the Proxmox dev CT), which PGlite (single-connection) can't exercise.
//   Usage: set -a; source .env; set +a; npx tsx scripts/concurrency-check.ts
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url?.startsWith('postgresql')) {
  console.error('Set DATABASE_URL to a real postgresql:// server (not pglite).')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url, max: 12 })
let failures = 0

function assert(cond: boolean, msg: string) {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) failures++
}

try {
  const org = (await pool.query(`SELECT id FROM organizations LIMIT 1`)).rows[0]
  const staff = (await pool.query(`SELECT id FROM users WHERE role='staff' LIMIT 1`)).rows[0]

  // ---- Invariant 2: first-come, exactly-once shift claim ----
  const shift = (await pool.query(`
    INSERT INTO shifts (org_id, window_date, window_start_local, window_end_local, time_zone,
                        window_start_utc, window_end_utc, status)
    VALUES ($1, '2026-12-01', '07:00', '15:00', 'America/Los_Angeles',
            '2026-12-01T15:00:00Z', '2026-12-01T23:00:00Z', 'open')
    RETURNING id`, [org.id])).rows[0]

  const N = 8
  const results = await Promise.allSettled(
    Array.from({ length: N }, () =>
      pool.query(
        `INSERT INTO shift_claims (shift_id, staff_id, state) VALUES ($1, $2, 'pending')`,
        [shift.id, staff.id],
      ),
    ),
  )
  const won = results.filter((r) => r.status === 'fulfilled').length
  const lost = results.filter((r) => r.status === 'rejected').length
  assert(won === 1, `exactly one of ${N} concurrent claims succeeds (won=${won}, lost=${lost})`)
  assert(lost === N - 1, `the other ${N - 1} concurrent claims are rejected by the unique index`)

  const activeClaims = (await pool.query(
    `SELECT count(*)::int AS n FROM shift_claims WHERE shift_id=$1 AND state IN ('pending','approved')`,
    [shift.id],
  )).rows[0].n
  assert(activeClaims === 1, `DB holds exactly one active claim for the shift (n=${activeClaims})`)

  // A withdrawn claim frees the slot for a new active claim (state-scoped index).
  await pool.query(`UPDATE shift_claims SET state='withdrawn' WHERE shift_id=$1`, [shift.id])
  await pool.query(`INSERT INTO shift_claims (shift_id, staff_id, state) VALUES ($1, $2, 'pending')`, [shift.id, staff.id])
  assert(true, 'a new claim is allowed after the prior one is withdrawn')

  // cleanup
  await pool.query(`DELETE FROM shift_claims WHERE shift_id=$1`, [shift.id])
  await pool.query(`DELETE FROM shifts WHERE id=$1`, [shift.id])

  console.log(failures ? `\n${failures} FAILED` : '\nALL CONCURRENCY INVARIANTS HOLD')
} finally {
  await pool.end()
}
process.exit(failures ? 1 : 0)

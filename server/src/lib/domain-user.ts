import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users, customers, organizations } from '../db/schema'
import { log } from './log'

export interface DomainUser {
  id: string
  orgId: string
  role: 'customer' | 'staff' | 'manager' | 'admin'
  email: string
  displayName: string
}

/**
 * Resolve the domain user for an authenticated Better Auth user, provisioning
 * one on first sign-in if none exists. Better Auth owns the `user` table; our
 * `users`/`customers` tables are the domain graph, joined by EMAIL.
 *
 * Rules:
 * - Domain user already exists (seeded, or manager-created staff/manager, or a
 *   prior provision): use it as-is — never downgrade an existing role.
 * - No domain user: create one as `customer`, and either LINK to a customer
 *   record a manager pre-created with this email (the invite flow) or create a
 *   fresh customer record. This is what lets a real self-signup actually book.
 */
export async function resolveOrProvisionDomainUser(
  baUser: { email: string; name: string },
): Promise<DomainUser | null> {
  const db = getDb()

  const [existing] = await db.select().from(users).where(eq(users.email, baUser.email)).limit(1)
  if (existing) {
    // Ensure a customer record exists for customer-role users so booking works.
    if (existing.role === 'customer') {
      const [cust] = await db.select().from(customers).where(eq(customers.userId, existing.id)).limit(1)
      if (!cust) {
        // Link a manager-pre-created customer row (same email), else create one.
        const [byEmail] = await db.select().from(customers).where(eq(customers.email, baUser.email)).limit(1)
        if (byEmail && !byEmail.userId) {
          await db.update(customers).set({ userId: existing.id }).where(eq(customers.id, byEmail.id))
        } else if (!byEmail) {
          await db.insert(customers).values({ orgId: existing.orgId, userId: existing.id, name: existing.displayName, email: baUser.email })
        }
      }
    }
    return existing
  }

  // No domain user — provision a customer. Pick the (single-tenant) org.
  const [org] = await db.select().from(organizations).limit(1)
  if (!org) {
    log.warn({ email: baUser.email }, 'cannot provision domain user — no organization exists')
    return null
  }

  const [created] = await db.insert(users).values({
    orgId: org.id,
    role: 'customer',
    email: baUser.email,
    displayName: baUser.name,
  }).returning()

  // Link a pre-created customer row by email (invite flow), else create one.
  const [byEmail] = await db.select().from(customers).where(eq(customers.email, baUser.email)).limit(1)
  if (byEmail && !byEmail.userId) {
    await db.update(customers).set({ userId: created!.id }).where(eq(customers.id, byEmail.id))
  } else if (!byEmail) {
    await db.insert(customers).values({ orgId: org.id, userId: created!.id, name: baUser.name, email: baUser.email })
  }

  log.info({ email: baUser.email, userId: created!.id }, 'provisioned domain user (customer)')
  return created!
}

/**
 * The customer record id owned by this domain user, or null for staff/managers
 * (or an unlinked customer). Routes use this to scope "(C) own" reads.
 */
export async function ownCustomerId(du: DomainUser): Promise<string | null> {
  if (du.role !== 'customer') return null
  const db = getDb()
  const [cust] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, du.id)).limit(1)
  return cust?.id ?? null
}

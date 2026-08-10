import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { pets, threads, reservations } from '../db/schema'
import { AppError } from './errors'
import { ownCustomerId, type DomainUser } from './domain-user'

// Object-level authorization (the by-id complement to the list-endpoint
// scoping): staff/manager/admin pass; customers must OWN the object.
// Unguessable UUIDs are not a control — these checks are.

/** Staff, manager, and admin share the whole business surface. */
export const isStaff = (du: DomainUser | null | undefined): boolean =>
  !!du && du.role !== 'customer'

/** Throw NOT_FOUND unless the caller may touch this pet. (404, not 403 —
 *  existence of someone else's records is itself private.) */
export async function assertPetAccess(du: DomainUser | null | undefined, petId: string): Promise<void> {
  if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (isStaff(du)) return
  const db = getDb()
  const custId = await ownCustomerId(du)
  const [pet] = await db.select({ customerId: pets.customerId }).from(pets).where(eq(pets.id, petId)).limit(1)
  if (!pet || !custId || pet.customerId !== custId) throw new AppError('NOT_FOUND', 'Pet not found')
}

/** Throw NOT_FOUND unless the caller participates in this thread. */
export async function assertThreadAccess(du: DomainUser | null | undefined, threadId: string): Promise<void> {
  if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (isStaff(du)) return
  const db = getDb()
  const custId = await ownCustomerId(du)
  const [t] = await db.select({ customerId: threads.customerId }).from(threads).where(eq(threads.id, threadId)).limit(1)
  if (!t || !custId || t.customerId !== custId) throw new AppError('NOT_FOUND', 'Thread not found')
}

/** Throw NOT_FOUND unless the caller owns this reservation. */
export async function assertReservationAccess(du: DomainUser | null | undefined, reservationId: string): Promise<void> {
  if (!du) throw new AppError('UNAUTHORIZED', 'Not authenticated')
  if (isStaff(du)) return
  const db = getDb()
  const custId = await ownCustomerId(du)
  const [r] = await db.select({ customerId: reservations.customerId }).from(reservations).where(eq(reservations.id, reservationId)).limit(1)
  if (!r || !custId || r.customerId !== custId) throw new AppError('NOT_FOUND', 'Reservation not found')
}

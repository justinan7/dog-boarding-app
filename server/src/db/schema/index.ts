// Barrel: re-export every enum + table, and assemble the `schema` object passed
// to drizzle() (for the typed query API and migrations).
export * from './enums'
export * from './identity'
export * from './crm'
export * from './booking'
export * from './care'
export * from './messaging'
export * from './workforce'
export * from './money'
export * from './compliance'
export * from './platform'

// Better Auth's own tables (user, session, account, verification) — included in
// our migration so they exist in the same DB. The drizzle adapter + auth.ts
// reference these for table discovery.
export * from './report-cards'

export {
  user as baUser,
  session as baSession,
  account as baAccount,
  verification as baVerification,
} from './better-auth'

import * as identity from './identity'
import * as crm from './crm'
import * as booking from './booking'
import * as care from './care'
import * as messaging from './messaging'
import * as workforce from './workforce'
import * as money from './money'
import * as compliance from './compliance'
import * as platform from './platform'
import * as reportCardsModule from './report-cards'
import * as betterAuth from './better-auth'

export const schema = {
  ...identity,
  ...crm,
  ...booking,
  ...care,
  ...messaging,
  ...workforce,
  ...money,
  ...compliance,
  ...platform,
  ...reportCardsModule,
  ...betterAuth,
}

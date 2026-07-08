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

import * as identity from './identity'
import * as crm from './crm'
import * as booking from './booking'
import * as care from './care'
import * as messaging from './messaging'
import * as workforce from './workforce'
import * as money from './money'
import * as compliance from './compliance'
import * as platform from './platform'

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
}

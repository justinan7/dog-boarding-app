import type { DomainUser } from './domain-user'

// The Hono env type shared by the app and all sub-routers, giving them typed
// access to the auth session AND the resolved domain user (role, orgId, ids).
export type AppEnv = {
  Variables: {
    user: { id: string; email: string; name: string } | null
    session: { id: string } | null
    // Our domain user (users/customers graph), provisioned on first sign-in.
    // Null when unauthenticated or provisioning failed.
    domainUser: DomainUser | null
  }
}

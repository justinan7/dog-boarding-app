// The Hono env type shared by the app and all sub-routers, giving them typed
// access to c.get('user') / c.get('session'). Defined separately to avoid a
// circular dep between app.ts (which creates the auth) and the routes (which
// consume its types).
export type AppEnv = {
  Variables: {
    user: { id: string; email: string; name: string } | null
    session: { id: string } | null
  }
}

import { useEffect } from 'react'
import { Centrifuge } from 'centrifuge'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useAuth } from './auth-context'

// Realtime bridge: Centrifugo publications are HINTS ({kind, ...ids}) — we
// invalidate the matching react-query caches and let REST refetch the truth.
// When the server has no Centrifugo configured (dev), /realtime/token says
// {enabled:false} and this whole thing silently stays REST-only.

// Event kind → react-query cache key roots to invalidate.
const INVALIDATIONS: Record<string, string[]> = {
  message: ['thread-messages', 'threads'],
  'care-task': ['care-tasks'],
  reservation: ['reservations', 'capacity'],
  'report-card': ['report-cards'],
  shift: ['shifts', 'shifts-mine'],
}

function invalidateFor(qc: QueryClient, kind: string | undefined) {
  for (const key of INVALIDATIONS[kind ?? ''] ?? []) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}

async function fetchToken(): Promise<{ enabled: boolean; token: string | null; url: string | null }> {
  const res = await fetch('/api/v1/realtime/token', { credentials: 'include' })
  if (!res.ok) return { enabled: false, token: null, url: null }
  return res.json()
}

export function useRealtime() {
  const { user } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (!user) return
    let client: Centrifuge | null = null
    let cancelled = false

    void (async () => {
      try {
        const cfg = await fetchToken()
        if (!cfg.enabled || !cfg.token || !cfg.url || cancelled) return

        const wsUrl = new URL(cfg.url, window.location.href)
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

        client = new Centrifuge(wsUrl.toString(), {
          token: cfg.token,
          getToken: async () => (await fetchToken()).token ?? '',
        })
        // Server-side subscriptions (from the JWT) surface at client level.
        client.on('publication', (ctx) => {
          invalidateFor(qc, (ctx.data as { kind?: string } | undefined)?.kind)
        })
        client.connect()
      } catch {
        // realtime is strictly optional
      }
    })()

    return () => {
      cancelled = true
      client?.disconnect()
    }
  }, [user?.id, qc]) // eslint-disable-line react-hooks/exhaustive-deps
}

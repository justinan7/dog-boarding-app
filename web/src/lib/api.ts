// API client — thin fetch wrapper that handles auth (cookie for web, bearer
// for native) and the error envelope from api-contract.md §1.

const BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

class ApiClientError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown
  constructor(status: number, body: { error: ApiError }) {
    super(body.error.message)
    this.code = body.error.code
    this.status = status
    this.details = body.error.details
  }
}

export { ApiClientError }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include', // send cookies
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }))
    throw new ApiClientError(res.status, body as { error: ApiError })
  }
  if (res.status === 204) return undefined as T
  return res.json() as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Auth helpers (Better Auth endpoints)
export const auth = {
  signUp: (email: string, password: string, name: string) =>
    request<{ user: { id: string; name: string; email: string } }>(
      '/api/auth/sign-up/email',
      { method: 'POST', body: JSON.stringify({ email, password, name }) },
    ),
  signIn: (email: string, password: string) =>
    request<{ user: { id: string; name: string; email: string } }>(
      '/api/auth/sign-in/email',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  signOut: () => request<void>('/api/auth/sign-out', { method: 'POST' }),
  getMe: () => api.get<{
    id: string; role: string; name: string; email: string
    customerId: string | null; staffId: string | null
    managerElevatedUntil: string | null
  }>('/api/v1/me'),
  elevate: (pin: string) => api.post<void>('/api/v1/me/elevate', { pin }),
  deElevate: () => api.post<void>('/api/v1/me/de-elevate'),
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

// Response shapes (the subset the UI consumes — matches docs/api-contract.md).
export interface Reservation {
  id: string; customerId: string; customerName: string; petNames: string[]
  serviceType: string; status: string
  startDate: string; endDate: string; depositCents: number; notes?: string | null
  timeZone: string; createdAt: string
}
export interface CareTask {
  id: string; reservationId: string; petId: string; petName: string; kind: string; label: string
  dose?: string | null; scheduledDate: string; scheduledLocalTime: string
  nextFireUtc: string; assignedStaffId?: string | null; assigneeDisplay?: string | null; state: string
}
export interface Thread {
  id: string; customerId: string; reservationId?: string | null
  assignedStaffId?: string | null; flags?: string[] | null; lastMessageAt?: string | null
}
export interface CapacityNight { date: string; booked: number; full: boolean }
export interface ReportsSummary {
  occupancy: { avgPct: number; nights: { date: string; booked: number }[] }
  revenue: { boardingCents: number; upsellsCents: number; totalCents: number; outstandingCents: number; outstandingCount: number }
  staff: { display: string; shifts: number; tasks: number; onTimePct: number }[]
}
export interface Customer { id: string; name: string; email?: string | null; phone?: string | null }
export interface Pet {
  id: string; customerId: string; name: string; breed?: string | null; weightLb?: number | null
  sex: string; behaviorNotes?: string | null
}

type List<T> = { items: T[]; nextCursor?: string | null }

// ---- Queries ----
export const useReservations = (status?: string) =>
  useQuery({
    queryKey: ['reservations', status ?? 'all'],
    queryFn: () => api.get<List<Reservation>>(`/api/v1/reservations${status ? `?status=${status}` : ''}`),
  })

export const useCareTasks = (params: { date?: string; state?: string } = {}) =>
  useQuery({
    queryKey: ['care-tasks', params],
    queryFn: () => {
      const q = new URLSearchParams(params as Record<string, string>).toString()
      return api.get<List<CareTask>>(`/api/v1/care-tasks${q ? `?${q}` : ''}`)
    },
  })

export const useCapacity = (from: string, to: string) =>
  useQuery({
    queryKey: ['capacity', from, to],
    queryFn: () => api.get<{ capacity: number; nights: CapacityNight[] }>(`/api/v1/capacity?from=${from}&to=${to}`),
  })

export const useThreads = (filter?: string) =>
  useQuery({
    queryKey: ['threads', filter ?? 'all'],
    queryFn: () => api.get<List<Thread>>(`/api/v1/threads${filter ? `?filter=${filter}` : ''}`),
  })

export const useReportsSummary = (month: string) =>
  useQuery({
    queryKey: ['reports-summary', month],
    queryFn: () => api.get<ReportsSummary>(`/api/v1/reports/summary?month=${month}`),
  })

export interface AuditEntry {
  id: string; occurredAt: string; actorDisplay?: string | null; actorRole?: string | null
  action: string; subjectType: string; subjectId?: string | null
}
export const useAudit = () =>
  useQuery({
    queryKey: ['audit'],
    queryFn: () => api.get<List<AuditEntry>>(`/api/v1/reports/audit`),
  })

export const useCustomers = (q?: string) =>
  useQuery({
    queryKey: ['customers', q ?? ''],
    queryFn: () => api.get<List<Customer>>(`/api/v1/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  })

export const usePets = (customerId?: string) =>
  useQuery({
    queryKey: ['pets', customerId ?? 'all'],
    queryFn: () => api.get<List<Pet>>(`/api/v1/pets${customerId ? `?customerId=${customerId}` : ''}`),
  })

// ---- Mutations ----
export function useReservationDecision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, body }: { id: string; decision: 'approve' | 'deny' | 'waitlist'; body?: unknown }) =>
      api.post(`/api/v1/reservations/${id}/${decision}`, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['capacity'] })
      qc.invalidateQueries({ queryKey: ['care-tasks'] })
    },
  })
}

export function useCompleteCareTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { outcome: string; note?: string; managerOverride?: boolean } }) =>
      api.post(`/api/v1/care-tasks/${id}/complete`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care-tasks'] }),
  })
}

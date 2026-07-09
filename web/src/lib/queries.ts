import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

// Response shapes (the subset the UI consumes — matches docs/api-contract.md).
export interface ReservationPet { id: string; name: string; breed?: string | null }
export interface Reservation {
  id: string; customerId: string; customerName: string
  petNames: string[]; pets: ReservationPet[]
  serviceType: string; status: string
  startDate: string; endDate: string
  dropoffLocalTime?: string | null; pickupLocalTime?: string | null
  depositCents: number; notes?: string | null
  timeZone: string; createdAt: string
}
export interface CareTask {
  id: string; reservationId: string; petId: string; petName: string; kind: string; label: string
  dose?: string | null; scheduledDate: string; scheduledLocalTime: string
  nextFireUtc: string; assignedStaffId?: string | null; assigneeDisplay?: string | null; state: string
}
export interface Thread {
  id: string; customerId: string; customerName: string; reservationId?: string | null
  assignedStaffId?: string | null; flags?: string[] | null; lastMessageAt?: string | null
  lastBody?: string | null; lastSenderRole?: string | null
}
export interface MessageAttachment { id: string; kind: string; objectKey: string }
export interface Message {
  id: string; threadId: string; senderUserId: string
  senderRole: 'customer' | 'staff' | 'manager'; senderDisplay: string
  body?: string | null; sentAt: string; readAt?: string | null
  attachments?: MessageAttachment[]
}
export interface ReportCard {
  id: string; reservationId: string; petId: string; petName?: string
  date: string; status: 'draft' | 'sent'
  mood?: string | null; appetite?: string | null
  photoObjectKeys?: string[] | null; bestMoment?: string | null
  careLogSummary?: string | null; sentAt?: string | null; heartedAt?: string | null
}
export interface Shift {
  id: string; windowDate: string; windowStartLocal: string; windowEndLocal: string
  status: string; dogCount?: number | null; medRoundCount?: number | null
  notes?: string | null
  activeClaim?: { staffId: string; staffDisplay: string; state: string } | null
}
export interface MyShift {
  shift: Omit<Shift, 'activeClaim'>
  claim: { id: string; shiftId: string; staffId: string; state: string }
}
export interface CareProfileItem {
  id: string; kind: 'feeding' | 'medication' | 'task'; label: string
  dose?: string | null; localTime: string; timeZone: string; instructions?: string | null
}
export interface Vaccination {
  id: string; type: string; expiresOn?: string | null; status: string
}
export interface PetDetail extends Pet {
  careProfile: CareProfileItem[]; vaccinations: Vaccination[]; safetyFlags: string[]
}
export interface Invoice {
  id: string; reservationId: string; status: string
  subtotalCents: number; taxCents: number; depositPaidCents: number; balanceCents: number
}
export interface InvoiceLineItem {
  id: string; kind: string; label: string; qty: number; unitCents: number
}
export interface Addon { id: string; label: string; priceCents: number; per: 'stay' | 'day' }
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
/** Public client config (demo-mode chrome, etc). Fetched pre-auth; cached hard. */
export const useAppConfig = () =>
  useQuery({
    queryKey: ['app-config'],
    staleTime: Infinity,
    queryFn: () => api.get<{ demoMode: boolean; vapidPublicKey: string | null }>('/api/v1/config'),
  })

export const useReservations = (status?: string) =>
  useQuery({
    queryKey: ['reservations', status ?? 'all'],
    queryFn: () => api.get<List<Reservation>>(`/api/v1/reservations${status ? `?status=${status}` : ''}`),
  })

export const useCareTasks = (params: { date?: string; state?: string; petId?: string } = {}) =>
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

export const useThreadMessages = (threadId: string | null) =>
  useQuery({
    queryKey: ['thread-messages', threadId],
    enabled: !!threadId,
    queryFn: () => api.get<List<Message>>(`/api/v1/threads/${threadId}/messages`),
  })

export const useReportCards = (params: { petId?: string; reservationId?: string } = {}) =>
  useQuery({
    queryKey: ['report-cards', params],
    queryFn: () => {
      const q = new URLSearchParams(params as Record<string, string>).toString()
      return api.get<List<ReportCard>>(`/api/v1/report-cards${q ? `?${q}` : ''}`)
    },
  })

export const usePetDetail = (petId: string | null) =>
  useQuery({
    queryKey: ['pet', petId],
    enabled: !!petId,
    queryFn: () => api.get<PetDetail>(`/api/v1/pets/${petId}`),
  })

export const useInvoice = (reservationId: string | null) =>
  useQuery({
    queryKey: ['invoice', reservationId],
    enabled: !!reservationId,
    queryFn: () => api.get<{ invoice: Invoice | null; lineItems: InvoiceLineItem[] }>(
      `/api/v1/invoices?reservationId=${reservationId}`,
    ),
  })

export const useAddons = () =>
  useQuery({
    queryKey: ['addons'],
    queryFn: () => api.get<List<Addon>>('/api/v1/addons'),
  })

export const useShifts = (status?: string) =>
  useQuery({
    queryKey: ['shifts', status ?? 'all'],
    queryFn: () => api.get<List<Shift>>(`/api/v1/shifts${status ? `?status=${status}` : ''}`),
  })

export const useMyShifts = () =>
  useQuery({
    queryKey: ['shifts-mine'],
    queryFn: () => api.get<List<MyShift>>('/api/v1/shifts/mine'),
  })

// ---- Mutations ----
export function useSendMessage(threadId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (msg: { body?: string; attachmentKeys?: string[] }) =>
      api.post(`/api/v1/threads/${threadId}/messages`, msg),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread-messages', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })
}

export function useHeartReportCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/report-cards/${id}/heart`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-cards'] }),
  })
}

export interface ReportCardDraft {
  reservationId: string; petId: string; date: string
  mood?: string; appetite?: string; bestMoment?: string
  photoKeys?: string[]
}
export function useCreateReportCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ draft, send }: { draft: ReportCardDraft; send: boolean }) => {
      const card = await api.post<ReportCard>('/api/v1/report-cards', draft)
      if (send) return api.post<ReportCard>(`/api/v1/report-cards/${card.id}/send`)
      return card
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-cards'] }),
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      petIds: string[]; startDate: string; endDate: string
      dropoffLocalTime?: string; pickupLocalTime?: string; notes?: string
    }) => api.post<Reservation & { warnings: string[] }>('/api/v1/reservations', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['capacity'] })
    },
  })
}

export function useCancelReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/reservations/${id}/cancel`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useClaimShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/shifts/${id}/claim`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      qc.invalidateQueries({ queryKey: ['shifts-mine'] })
    },
  })
}

export function useWithdrawClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/shifts/${id}/claim`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      qc.invalidateQueries({ queryKey: ['shifts-mine'] })
    },
  })
}

export function useCreateIncident() {
  return useMutation({
    mutationFn: (body: {
      type: string; severity: string; petIds: string[]
      occurredAt: string; description: string
      photoObjectKeys?: string[]
      actionsTaken?: string[]; notifyOwnerNow?: boolean; reservationId?: string
    }) => api.post('/api/v1/incidents', body),
  })
}

export function useAddVaccinationRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ petId, body }: { petId: string; body: { type: string; expiresOn?: string; documentObjectKey?: string } }) =>
      api.post(`/api/v1/pets/${petId}/vaccinations`, body),
    onSuccess: (_d, { petId }) => qc.invalidateQueries({ queryKey: ['pet', petId] }),
  })
}

export function useAddCareTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      petId: string; reservationId: string; kind: 'feeding' | 'medication' | 'task'
      label: string; dose?: string; scheduledDate: string
      scheduled: { localTime: string; timeZone: string }
    }) => api.post('/api/v1/care-tasks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['care-tasks'] }),
  })
}

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

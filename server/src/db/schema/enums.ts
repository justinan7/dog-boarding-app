import { pgEnum } from 'drizzle-orm/pg-core'

// Closed, stable value sets get pg enums; extensible sets (vax type, safety
// flag, audit action) stay as text. Values reconcile data-model.md with
// api-contract.md.

export const roleEnum = pgEnum('role', ['customer', 'staff', 'manager'])
export type Role = (typeof roleEnum.enumValues)[number]
export const petSexEnum = pgEnum('pet_sex', ['male', 'female', 'unknown'])
export const careKindEnum = pgEnum('care_kind', ['feeding', 'medication', 'task'])
export const vaxStatusEnum = pgEnum('vax_status', ['valid', 'expiring', 'expired'])
export const serviceTypeEnum = pgEnum('service_type', ['boarding', 'daycare', 'grooming'])

export const reservationStatusEnum = pgEnum('reservation_status', [
  'requested', 'approved', 'denied', 'waitlisted', 'cancelled',
  'checked_in', 'in_stay', 'checked_out', 'complete',
])
export const waitlistStatusEnum = pgEnum('waitlist_status', ['waiting', 'offered', 'claimed', 'expired', 'cancelled'])

export const careTaskStateEnum = pgEnum('care_task_state', [
  'scheduled', 'due', 'overdue', 'done', 'refused', 'skipped', 'missed',
])
export const careOutcomeEnum = pgEnum('care_outcome', ['given', 'refused', 'skipped'])

export const attachmentKindEnum = pgEnum('attachment_kind', ['photo', 'document'])
export const attachmentVariantEnum = pgEnum('attachment_variant', ['orig', 'thumb'])
export const takeoverActionEnum = pgEnum('takeover_action', ['view', 'join', 'takeover', 'handback'])

export const shiftStatusEnum = pgEnum('shift_status', ['open', 'claimed', 'approved', 'filled'])
export const claimStateEnum = pgEnum('claim_state', ['pending', 'approved', 'denied', 'withdrawn'])
export const swapStateEnum = pgEnum('swap_state', ['pending', 'approved', 'denied'])

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'void'])
export const lineItemKindEnum = pgEnum('line_item_kind', ['boarding', 'addon', 'discount', 'tax'])
export const addonPerEnum = pgEnum('addon_per', ['stay', 'day'])
export const paymentProviderEnum = pgEnum('payment_provider', ['stripe'])
export const paymentKindEnum = pgEnum('payment_kind', ['deposit', 'balance', 'refund'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'succeeded', 'failed', 'refunded'])

export const waiverStatusEnum = pgEnum('waiver_status', ['signed', 'missing', 'outdated'])
export const incidentTypeEnum = pgEnum('incident_type', ['bite', 'injury', 'escape', 'illness', 'other'])
export const incidentSeverityEnum = pgEnum('incident_severity', ['minor', 'moderate', 'severe'])

export const pushPlatformEnum = pgEnum('push_platform', ['webpush', 'apns', 'fcm'])
export const notifyChannelEnum = pgEnum('notify_channel', ['push', 'sms', 'email'])

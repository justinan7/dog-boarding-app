import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { pk, createdAt } from './_shared'
import { users } from './identity'
import { pushPlatformEnum, notifyChannelEnum } from './enums'

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: pk(),
  userId: uuid('user_id').notNull().references(() => users.id),
  platform: pushPlatformEnum('platform').notNull(),
  token: text('token').notNull(), // web-push subscription JSON, or an APNs/FCM device token
  deviceName: text('device_name'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index('push_user_idx').on(t.userId)])

export const notificationPreferences = pgTable('notification_preferences', {
  id: pk(),
  userId: uuid('user_id').notNull().references(() => users.id),
  channel: notifyChannelEnum('channel').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('notif_pref_user_channel_uq').on(t.userId, t.channel)])

import {
  LayoutDashboard, CalendarDays, Inbox, Images, Menu,
  Dog, UserRound, ChevronDown, ChevronLeft, ChevronRight, ChevronsRight,
  TriangleAlert, Eye, Check, Bell, ClipboardCheck, FileCheck,
  Settings, LogOut, Lock, Send, Plus, Search, MessageCircle, Clock,
  Heart, Info, PawPrint, type LucideIcon,
} from 'lucide-react'

// Lucide icons, addressed by the design system's kebab-case names.
// Rendered so they tint with `currentColor`, exactly like the DS Icon component.
const MAP: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'calendar-days': CalendarDays,
  inbox: Inbox,
  images: Images,
  menu: Menu,
  dog: Dog,
  'user-round': UserRound,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevrons-right': ChevronsRight,
  'triangle-alert': TriangleAlert,
  eye: Eye,
  check: Check,
  bell: Bell,
  'clipboard-check': ClipboardCheck,
  'file-check': FileCheck,
  settings: Settings,
  'log-out': LogOut,
  lock: Lock,
  send: Send,
  plus: Plus,
  search: Search,
  'message-circle': MessageCircle,
  clock: Clock,
  heart: Heart,
  info: Info,
  'paw-print': PawPrint,
}

export type IconName = keyof typeof MAP

export function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  style,
}: {
  name: IconName | string
  size?: number
  strokeWidth?: number
  style?: React.CSSProperties
}) {
  const Cmp = MAP[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} style={style} aria-hidden />
}
